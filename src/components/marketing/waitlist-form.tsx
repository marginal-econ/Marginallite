import { DEFAULT_SETTINGS, type PublicSettings } from "@/lib/site-settings";
/**
 * The waitlist form, and the success card it turns into.
 *
 * The whole flow is one component because the success state is not a
 * different page — it is the same card, turned over. Routing to a "thanks"
 * page here would throw away the scroll position, the referral code that was
 * just issued, and the sense that something happened right where you clicked.
 *
 * States, all of them visible and all of them announced:
 *
 *   idle → loading → success | already-registered | invalid-email
 *                            | rate-limited | error
 *
 * Accessibility notes that are load-bearing rather than decorative:
 *  - the message region is `role="status" aria-live="polite"`, so a screen
 *    reader hears the outcome without the focus moving out from under it;
 *  - the input carries `aria-invalid` and `aria-describedby`, so the error is
 *    read as part of the field rather than as loose text nearby;
 *  - the button is disabled and `aria-busy` while in flight, which is also
 *    what makes double submission impossible;
 *  - the celebration is decoration only. Every word of the success state is
 *    present with animation off.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, Copy, Loader2, Mail, PartyPopper, Share2 } from "lucide-react";

import { centreOf, fireConfetti, fireSpark } from "@/lib/confetti";
import {
  captureReferralCode,
  fetchWaitlistStats,
  forgetOwnSignup,
  joinWaitlist,
  looksLikeEmail,
  readOwnSignup,
  rememberOwnSignup,
  shareUrlFor,
  type WaitlistResult,
  type WaitlistState,
} from "@/lib/waitlist-client";
import { cn } from "@/lib/utils";

type Props = {
  /** `hero` is the compact inline form; `wide` is the boxed one lower down. */
  variant?: "hero" | "wide";
  className?: string;
  /** Copy on the button. The page uses two different ones. */
  cta?: string;
  onJoined?: (result: WaitlistResult) => void;
  settings?: PublicSettings;
  settingsLoaded?: boolean;
};

const TONE: Record<WaitlistState, string> = {
  idle: "",
  loading: "",
  "verification-required": "text-primary",
  success: "text-[var(--ao3)]",
  "already-registered": "text-[var(--ao2)]",
  "invalid-email": "text-destructive",
  "rate-limited": "text-[var(--warning,var(--ao2))]",
  error: "text-destructive",
};

const WAITLIST_SYNC_EVENT = "marginalite:waitlist-state";
const RESEND_COOLDOWN_SECONDS = 60;
type WaitlistSyncDetail =
  | {
      kind: "challenge";
      email: string;
      name: string;
      city: string;
      country: string;
      referredBy: string | null;
      challengeId: string;
      message: string;
    }
  | { kind: "result"; result: WaitlistResult }
  | { kind: "reset" };

export function WaitlistForm({
  variant = "hero",
  className,
  cta = "Join the waitlist",
  onJoined,
  settings = DEFAULT_SETTINGS,
  settingsLoaded = true,
}: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  // The name is required, so the field is always shown. Its own error flag is
  // kept separate from `state` so the red border lands on the box that is
  // actually wrong rather than on the email box below it.
  const [nameError, setNameError] = useState(false);
  const [cityError, setCityError] = useState(false);
  const [countryError, setCountryError] = useState(false);
  const [referralError, setReferralError] = useState(false);
  const [state, setState] = useState<WaitlistState>("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<WaitlistResult | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const cityRef = useRef<HTMLInputElement | null>(null);
  const countryRef = useRef<HTMLInputElement | null>(null);
  const referralRef = useRef<HTMLInputElement | null>(null);
  const mountedAt = useRef<number>(0);
  const referredBy = useRef<string | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const fieldId = useId();
  const messageId = `${fieldId}-message`;

  useEffect(() => {
    mountedAt.current = performance.now();
    referredBy.current = captureReferralCode();
    setReferralCode(referredBy.current ?? "");

    // Local storage is only a hint. Confirm it against the database so an
    // admin removal clears the old success card on the visitor's next load.
    const remembered = readOwnSignup();
    if (remembered) {
      void fetchWaitlistStats(remembered.referralCode).then((stats) => {
        if (stats?.active === false) {
          forgetOwnSignup();
          return;
        }
        // If verification cannot be reached, keep the last known state rather
        // than falsely telling a real member to join again while offline.
        setResult({
          state: "already-registered",
          message: "You're already on the waitlist.",
          referralCode: remembered.referralCode,
          position: stats?.position ?? remembered.position,
        });
        setState("already-registered");
      });
    }

    const sync = (event: Event) => {
      const detail = (event as CustomEvent<WaitlistSyncDetail>).detail;
      if (detail.kind === "challenge") {
        setEmail(detail.email);
        setName(detail.name);
        setCity(detail.city);
        setCountry(detail.country);
        setReferralCode(detail.referredBy ?? "");
        referredBy.current = detail.referredBy;
        setChallengeId(detail.challengeId);
        setOtp("");
        setResendIn(RESEND_COOLDOWN_SECONDS);
        setState("verification-required");
        setMessage(detail.message);
      } else if (detail.kind === "result") {
        setResult(detail.result);
        setState(detail.result.state);
        setMessage(detail.result.message);
      } else {
        setResult(null);
        setState("idle");
        setMessage("");
        setEmail("");
        setName("");
        setCity("");
        setCountry("");
        setReferralCode("");
        referredBy.current = null;
        setChallengeId(null);
        setOtp("");
        setResendIn(0);
      }
    };
    window.addEventListener(WAITLIST_SYNC_EVENT, sync);
    return () => {
      inFlight.current?.abort();
      window.removeEventListener(WAITLIST_SYNC_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  const resendCode = useCallback(async () => {
    if (!challengeId || resendIn > 0 || state === "loading") return;

    setState("loading");
    setMessage("");
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    const outcome = await joinWaitlist({
      email: email.trim(),
      name: name.trim() || undefined,
      city: city.trim(),
      country: country.trim(),
      referredBy: referredBy.current,
      company,
      elapsedMs: Math.round(performance.now() - mountedAt.current),
      signal: controller.signal,
    });

    setState(outcome.state);
    setMessage(outcome.message);
    if (outcome.state === "verification-required" && outcome.challengeId) {
      setChallengeId(outcome.challengeId);
      setOtp("");
      setResendIn(RESEND_COOLDOWN_SECONDS);
      window.dispatchEvent(
        new CustomEvent<WaitlistSyncDetail>(WAITLIST_SYNC_EVENT, {
          detail: {
            kind: "challenge",
            email: email.trim(),
            name: name.trim(),
            city: city.trim(),
            country: country.trim(),
            referredBy: referredBy.current,
            challengeId: outcome.challengeId,
            message: "A new verification code was sent. Please check your inbox and spam folder.",
          },
        }),
      );
    } else if (outcome.state === "rate-limited") {
      setResendIn(RESEND_COOLDOWN_SECONDS);
    }
  }, [challengeId, city, company, country, email, name, resendIn, state]);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (state === "loading" || !settingsLoaded || !settings.signupOpen) return; // hard stop on double submission

      const trimmed = email.trim();
      const trimmedName = name.trim();
      const trimmedCity = city.trim();
      const trimmedCountry = country.trim();

      // Reported first because it is the field above: sending someone back up
      // the form after clearing a lower error reads as the form moving the
      // goalposts.
      if (settings.requireName && trimmedName.length === 0) {
        setNameError(true);
        setState("invalid-email");
        setMessage("Please add your name.");
        nameRef.current?.focus();
        return;
      }
      setNameError(false);

      if (
        trimmedCity.length < 2 ||
        !/\p{L}/u.test(trimmedCity) ||
        /https?:\/\/|www\.|@/i.test(trimmedCity)
      ) {
        setCityError(true);
        setState("invalid-email");
        setMessage("Enter your city, for example Chennai, Dubai or London.");
        cityRef.current?.focus();
        return;
      }
      setCityError(false);

      if (
        trimmedCountry.length < 2 ||
        !/\p{L}/u.test(trimmedCountry) ||
        /https?:\/\/|www\.|@/i.test(trimmedCountry)
      ) {
        setCountryError(true);
        setState("invalid-email");
        setMessage("Enter your country, for example India, Singapore or United Kingdom.");
        countryRef.current?.focus();
        return;
      }
      setCountryError(false);

      const trimmedReferralCode = referralCode.trim().toUpperCase();
      if (trimmedReferralCode && !/^[A-Z0-9]{4,16}$/.test(trimmedReferralCode)) {
        setReferralError(true);
        setState("invalid-email");
        setMessage("Enter a valid referral code using 4–16 letters or numbers.");
        referralRef.current?.focus();
        return;
      }
      setReferralError(false);
      referredBy.current = trimmedReferralCode || null;

      // Caught here so an obvious typo never costs a network round trip.
      if (!looksLikeEmail(trimmed)) {
        setState("invalid-email");
        setMessage("That doesn't look like an email address. Check it and try again.");
        inputRef.current?.focus();
        return;
      }

      // The click is acknowledged before the network is: a small spark at the
      // pointer, so pressing the button never feels like nothing happened.
      fireSpark(centreOf(buttonRef.current) ?? { x: 0, y: 0 });

      setState("loading");
      setMessage("");

      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      const outcome = await joinWaitlist({
        email: trimmed,
        name: name.trim() || undefined,
        city: trimmedCity,
        country: trimmedCountry,
        referredBy: referredBy.current,
        company,
        elapsedMs: Math.round(performance.now() - mountedAt.current),
        signal: controller.signal,
        challengeId: challengeId ?? undefined,
        otp: challengeId ? otp : undefined,
      });

      setState(outcome.state);
      setMessage(outcome.message);

      if (outcome.state === "verification-required" && outcome.challengeId) {
        setChallengeId(outcome.challengeId);
        setOtp("");
        setResendIn(RESEND_COOLDOWN_SECONDS);
        window.dispatchEvent(
          new CustomEvent<WaitlistSyncDetail>(WAITLIST_SYNC_EVENT, {
            detail: {
              kind: "challenge",
              email: trimmed,
              name: trimmedName,
              city: trimmedCity,
              country: trimmedCountry,
              referredBy: referredBy.current,
              challengeId: outcome.challengeId,
              message: outcome.message,
            },
          }),
        );
      }

      if (outcome.state === "success" || outcome.state === "already-registered") {
        setResult(outcome);
        rememberOwnSignup(outcome);
        onJoined?.(outcome);
        window.dispatchEvent(
          new CustomEvent<WaitlistSyncDetail>(WAITLIST_SYNC_EVENT, {
            detail: { kind: "result", result: outcome },
          }),
        );
      }

      if (outcome.state === "success") {
        // The real celebration, aimed at the button that was pressed.
        fireConfetti(centreOf(buttonRef.current));
        window.setTimeout(() => fireConfetti(centreOf(buttonRef.current), 34, 1.3), 260);
      }

      if (outcome.state === "invalid-email" || outcome.state === "error") {
        inputRef.current?.focus();
      }
    },
    [
      challengeId,
      city,
      company,
      country,
      email,
      name,
      onJoined,
      otp,
      referralCode,
      state,
      settings,
      settingsLoaded,
    ],
  );

  if (result) {
    return (
      <SuccessCard
        result={result}
        variant={variant}
        className={className}
        onReset={() => {
          forgetOwnSignup();
          setResult(null);
          setState("idle");
          setMessage("");
          setEmail("");
          setName("");
          setCity("");
          setCountry("");
          setReferralCode("");
          referredBy.current = null;
          setChallengeId(null);
          setOtp("");
          setResendIn(0);
          mountedAt.current = performance.now();
          window.dispatchEvent(
            new CustomEvent<WaitlistSyncDetail>(WAITLIST_SYNC_EVENT, {
              detail: { kind: "reset" },
            }),
          );
        }}
      />
    );
  }

  if (!settings.signupOpen)
    return (
      <p role="status" className="pop p-4 text-sm">
        {settings.closedMessage}
      </p>
    );

  const isLoading = state === "loading";
  const controlsDisabled = isLoading || !settingsLoaded;
  const hasError = state === "invalid-email" || state === "error" || state === "rate-limited";
  const labelClass = cn(
    "mb-1 block text-xs font-semibold",
    variant === "wide" ? "text-plum-foreground" : "text-foreground/75",
  );

  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn("w-full", className)}
      data-state={state}
      aria-labelledby={`${fieldId}-legend`}
    >
      <p id={`${fieldId}-legend`} className="sr-only">
        Join the Marginalite waitlist
      </p>

      {/* The honeypot. Off-screen rather than display:none — some bots skip
          hidden fields but happily fill anything still in the layout. It is
          out of the tab order and out of the accessibility tree, so no person
          ever reaches it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor={`${fieldId}-company`}>Company</label>
        <input
          id={`${fieldId}-company`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        />
      </div>

      {!challengeId ? (
        <div className="mb-2.5 grid gap-2.5 sm:grid-cols-2">
          <div>
            <label htmlFor={`${fieldId}-name`} className={labelClass}>
              Your name
            </label>
            <input
              ref={nameRef}
              id={`${fieldId}-name`}
              name="name"
              type="text"
              autoComplete="name"
              maxLength={80}
              required={settings.requireName}
              disabled={controlsDisabled}
              placeholder={settings.requireName ? "Your name" : "Your name (optional)"}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (nameError) {
                  setNameError(false);
                  setState("idle");
                  setMessage("");
                }
              }}
              aria-invalid={nameError || undefined}
              aria-describedby={message ? messageId : undefined}
              className={cn("waitlist-field", nameError && "waitlist-field-error")}
            />
          </div>
          <div>
            <label htmlFor={`${fieldId}-city`} className={labelClass}>
              Your city
            </label>
            <input
              ref={cityRef}
              id={`${fieldId}-city`}
              name="city"
              type="text"
              autoComplete="address-level2"
              maxLength={100}
              required
              disabled={controlsDisabled}
              placeholder="Your city"
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                if (cityError) {
                  setCityError(false);
                  setState("idle");
                  setMessage("");
                }
              }}
              aria-invalid={cityError || undefined}
              aria-describedby={message ? messageId : undefined}
              className={cn("waitlist-field", cityError && "waitlist-field-error")}
            />
          </div>
          <div>
            <label htmlFor={`${fieldId}-country`} className={labelClass}>
              Your country
            </label>
            <input
              ref={countryRef}
              id={`${fieldId}-country`}
              name="country"
              type="text"
              autoComplete="country-name"
              maxLength={100}
              required
              disabled={controlsDisabled}
              placeholder="Your country"
              value={country}
              onChange={(event) => {
                setCountry(event.target.value);
                if (countryError) {
                  setCountryError(false);
                  setState("idle");
                  setMessage("");
                }
              }}
              aria-invalid={countryError || undefined}
              aria-describedby={message ? messageId : undefined}
              className={cn("waitlist-field", countryError && "waitlist-field-error")}
            />
          </div>
          <div>
            <label htmlFor={`${fieldId}-referral`} className={labelClass}>
              Referral code <span className="font-normal opacity-70">(optional)</span>
            </label>
            <input
              ref={referralRef}
              id={`${fieldId}-referral`}
              name="referralCode"
              type="text"
              inputMode="text"
              autoComplete="off"
              maxLength={16}
              disabled={controlsDisabled}
              placeholder="Enter a friend’s referral code"
              value={referralCode}
              onChange={(event) => {
                const next = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                setReferralCode(next);
                referredBy.current = next || null;
                if (referralError) {
                  setReferralError(false);
                  setState("idle");
                  setMessage("");
                }
              }}
              aria-invalid={referralError || undefined}
              aria-describedby={message ? messageId : undefined}
              className={cn(
                "waitlist-field font-mono tracking-[0.12em] uppercase",
                referralError && "waitlist-field-error",
              )}
            />
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "flex flex-col gap-2.5",
          variant === "hero" ? "sm:flex-row sm:items-end" : "sm:flex-row sm:items-end",
        )}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor={`${fieldId}-${challengeId ? "otp" : "email"}`} className={labelClass}>
            {challengeId ? "Verification code" : "Email address"}
          </label>
          {challengeId ? (
            <input
              ref={inputRef}
              id={`${fieldId}-otp`}
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              disabled={controlsDisabled}
              placeholder="6-digit code"
              value={otp}
              onChange={(event) => {
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                setState("verification-required");
                setMessage("");
              }}
              aria-invalid={hasError || undefined}
              aria-describedby={message ? messageId : undefined}
              className={cn(
                "waitlist-field flex-1 tracking-[0.35em]",
                hasError && "waitlist-field-error",
              )}
            />
          ) : (
            <input
              ref={inputRef}
              id={`${fieldId}-email`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              maxLength={254}
              required
              disabled={controlsDisabled}
              placeholder="you@school.edu"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (hasError) {
                  setState("idle");
                  setMessage("");
                }
              }}
              aria-invalid={hasError || undefined}
              aria-describedby={message ? messageId : undefined}
              className={cn(
                "waitlist-field flex-1",
                hasError &&
                  !nameError &&
                  !cityError &&
                  !countryError &&
                  !referralError &&
                  "waitlist-field-error",
              )}
            />
          )}
        </div>

        <button
          ref={buttonRef}
          type="submit"
          disabled={controlsDisabled}
          aria-busy={isLoading || !settingsLoaded}
          className="pop pop-press shine group inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-80 sm:w-auto sm:px-5"
        >
          {!settingsLoaded ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading form…
            </>
          ) : isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {challengeId ? "Verifying…" : "Sending code…"}
            </>
          ) : (
            <>
              {challengeId ? "Verify & join" : cta}
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </>
          )}
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p
          className={cn(
            "text-xs",
            variant === "wide" ? "text-plum-foreground/80" : "text-muted-foreground",
          )}
        >
          {challengeId ? (
            <>
              Verification code sent to <strong>{email}</strong>. Please check your inbox and spam
              or junk folder. The code expires in 10 minutes.
            </>
          ) : (
            "We’ll verify your email before adding you to the waitlist."
          )}
        </p>
        {challengeId ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isLoading || resendIn > 0}
              className="text-xs font-medium underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={resendCode}
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </button>
            <button
              type="button"
              className="text-xs font-medium underline underline-offset-4"
              onClick={() => {
                setChallengeId(null);
                setOtp("");
                setResendIn(0);
                setState("idle");
                setMessage("");
                mountedAt.current = performance.now();
                window.dispatchEvent(
                  new CustomEvent<WaitlistSyncDetail>(WAITLIST_SYNC_EVENT, {
                    detail: { kind: "reset" },
                  }),
                );
              }}
            >
              Change email
            </button>
          </div>
        ) : null}
      </div>

      {/* Always rendered, so assistive technology has a region to watch from
          the first paint rather than one that appears mid-interaction. */}
      <p
        id={messageId}
        role="status"
        aria-live="polite"
        className={cn(
          "mt-2 min-h-[1.25rem] text-sm font-medium transition-opacity",
          TONE[state],
          message ? "opacity-100" : "opacity-0",
        )}
      >
        {message}
      </p>
    </form>
  );
}

/* ── The card the form turns into ────────────────────────────────────────── */

function SuccessCard({
  result,
  variant,
  className,
  onReset,
}: {
  result: WaitlistResult;
  variant: "hero" | "wide";
  className?: string;
  onReset: () => void;
}) {
  const isNew = result.state === "success";
  const code = result.referralCode ?? null;
  const [referrals, setReferrals] = useState<number | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    void fetchWaitlistStats(code).then((stats) => {
      if (!cancelled && stats && typeof stats.referrals === "number") setReferrals(stats.referrals);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const shareUrl = code ? shareUrlFor(code) : null;
  const shareText =
    "I just joined the waitlist for Marginalite — Cambridge IGCSE Economics (0455) responses marked like an examiner.";

  return (
    <div
      className={cn("pop pop-in relative overflow-hidden p-4 sm:p-6 md:p-7", className)}
      data-state={result.state}
    >
      <div
        className="paper-grid pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
      />

      <div className="relative">
        <span className="sticker absolute -top-1 right-0 z-10 bg-ao3 text-foreground">
          {isNew ? "You're in" : "Already in"}
        </span>

        <span className="pop-sm flex size-11 items-center justify-center bg-primary text-primary-foreground">
          {isNew ? (
            <PartyPopper className="size-5" aria-hidden="true" />
          ) : (
            <Check className="size-5" aria-hidden="true" />
          )}
        </span>

        <h3 className="mt-5 text-2xl font-bold text-balance md:text-3xl">
          {isNew ? <>{result.message}</> : <>You were already on the list.</>}
        </h3>

        <p className="mt-3 max-w-md text-sm leading-relaxed text-pretty text-muted-foreground md:text-base">
          {isNew
            ? "Your place is confirmed. We’ll email you when access becomes available. Until then, you can view your position and referral link below."
            : "Your place remains confirmed, and your referral link is still active."}
        </p>

        <div className="mt-4 flex max-w-md items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-3 text-sm leading-relaxed text-muted-foreground">
          <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p>
            Please continue checking your inbox and spam or junk folder for your access invitation.
            Adding Marginalite to your trusted senders can help ensure it arrives correctly.
          </p>
        </div>

        {result.position ? (
          <div className="layer-1 mt-6 flex flex-wrap items-center gap-3">
            <span className="pop-sm inline-flex items-baseline gap-1.5 bg-surface px-3.5 py-2">
              <span className="font-mono text-xl font-bold">#{result.position}</span>
              <span className="text-xs text-muted-foreground">in line</span>
            </span>
            {referrals !== null ? (
              <span className="chip-soft">
                {referrals} {referrals === 1 ? "friend joined" : "friends joined"} through you
              </span>
            ) : null}
          </div>
        ) : null}

        {code && shareUrl ? (
          <div className="mt-7 border-t border-border pt-6">
            <p className="eyebrow eyebrow-accent">Move up the queue</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Every classmate who joins through your link moves you up. Send it to the group chat
              that always asks what you got.
            </p>

            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <CopyField label="Your referral code" value={code} mono />
              <CopyField label="Your link" value={shareUrl} className="sm:flex-1" />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <ShareLink
                href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
                label="WhatsApp"
              />
              <ShareLink
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                label="X"
              />
              <ShareLink
                href={`mailto:?subject=${encodeURIComponent("Marginalite waitlist")}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`}
                label="Email"
              />
            </div>
          </div>
        ) : null}

        {variant === "wide" ? (
          <button
            type="button"
            onClick={onReset}
            className="mt-6 text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Sign up a different email
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** A read-only value with a copy button that confirms itself for two seconds. */
function CopyField({
  label,
  value,
  mono = false,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard is blocked outside a secure context and in some in-app
      // browsers. Selecting the text is the fallback that always works.
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("min-w-0", className)}>
      <p className="eyebrow text-[0.62rem]">{label}</p>
      <div className="pop-sm mt-1 flex items-center gap-2 bg-surface py-1.5 pr-1.5 pl-3">
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm",
            mono && "font-mono font-semibold tracking-wide",
          )}
          title={value}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          className="pop-press flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
        >
          {copied ? (
            <Check className="size-4 text-[var(--ao3)]" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? `${label} copied to clipboard` : ""}
      </span>
    </div>
  );
}

function ShareLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="pop-sm pop-press inline-flex items-center gap-1.5 bg-surface px-3 py-1.5 text-xs font-semibold"
    >
      <Share2 className="size-3.5" aria-hidden="true" />
      {label}
    </a>
  );
}
