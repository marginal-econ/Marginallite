import { isDisposableEmail } from "./disposable-email";

/**
 * Input normalisation and validation, shared by the endpoint and re-runnable
 * anywhere else on the server.
 *
 * The client validates too, but only to give fast feedback. Nothing here
 * trusts that: every field is re-checked on this side, because the client
 * check is a courtesy and this one is the rule.
 */

export const MAX_EMAIL_LENGTH = 254; // RFC 5321 practical maximum
export const MAX_NAME_LENGTH = 80;
export const MAX_CITY_LENGTH = 100;
export const MAX_COUNTRY_LENGTH = 100;

/**
 * Pragmatic email shape check. Deliberately not RFC 5322 — a full-grammar
 * regex accepts addresses no mail server will ever deliver to and is a
 * well-known source of catastrophic backtracking. This rejects the mistakes
 * people actually make (missing @, missing dot, trailing comma, spaces).
 */
const EMAIL_PATTERN = /^[^\s@,;:<>()[\]\\"]+@[^\s@.,;:<>()[\]\\"]+(\.[^\s@.,;:<>()[\]\\"]+)+$/;

/** ASCII control characters, which have no business in a name or an email. */
// eslint-disable-next-line no-control-regex -- stripping them is the point
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

export type NormalisedSignup = {
  email: string;
  name: string | null;
  city: string;
  country: string;
  referredBy: string | null;
};

export type ValidationFailure = {
  code: "INVALID_EMAIL" | "INVALID_PAYLOAD" | "DISPOSABLE_EMAIL";
  message: string;
};

/** Strips control characters, collapses whitespace runs, trims the ends. */
function tidy(value: string): string {
  return value.replace(CONTROL_CHARACTERS, " ").replace(/\s+/g, " ").trim();
}

export function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = tidy(raw).toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return null;
  if (!EMAIL_PATTERN.test(email)) return null;

  // A dot at either end of the domain, or two in a row, passes the pattern
  // above but is not a real host.
  const domain = email.slice(email.indexOf("@") + 1);
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return null;

  return email;
}

export function normaliseName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = tidy(raw).slice(0, MAX_NAME_LENGTH);
  return name.length > 0 ? name : null;
}

export function normaliseCity(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const city = tidy(raw).slice(0, MAX_CITY_LENGTH);
  // Require a recognisable place name rather than punctuation, a URL, or a
  // one-character placeholder. Unicode letters keep genuine city names in
  // every language valid; spaces, apostrophes, dots and hyphens cover common
  // forms such as St. John's and Thiruvananthapuram.
  if (city.length < 2 || !/\p{L}/u.test(city)) return null;
  if (/https?:\/\/|www\.|@/i.test(city)) return null;
  if (!/^[\p{L}\p{M}\p{N} .,'’()-]+$/u.test(city)) return null;
  return city;
}

export function normaliseCountry(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const country = tidy(raw).slice(0, MAX_COUNTRY_LENGTH);
  if (country.length < 2 || !/\p{L}/u.test(country)) return null;
  if (/https?:\/\/|www\.|@/i.test(country)) return null;
  if (!/^[\p{L}\p{M} .,'’()-]+$/u.test(country)) return null;
  return country;
}

/** Referral codes are the alphabet in `referral.ts` and nothing else. */
export function normaliseReferralCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9]{4,16}$/.test(code) ? code : null;
}

export function validateSignup(
  payload: unknown,
): { ok: true; value: NormalisedSignup } | { ok: false; error: ValidationFailure } {
  if (payload === null || typeof payload !== "object") {
    return { ok: false, error: { code: "INVALID_PAYLOAD", message: "Expected a JSON object." } };
  }

  const body = payload as Record<string, unknown>;
  const email = normaliseEmail(body.email);
  if (!email) {
    return {
      ok: false,
      error: {
        code: "INVALID_EMAIL",
        message: "That doesn't look like an email address. Check it and try again.",
      },
    };
  }

  if (isDisposableEmail(email)) {
    return {
      ok: false,
      error: {
        code: "DISPOSABLE_EMAIL",
        message:
          "Temporary email addresses aren't supported. Please use a permanent email address.",
      },
    };
  }

  const city = normaliseCity(body.city);
  if (!city) {
    return {
      ok: false,
      error: {
        code: "INVALID_PAYLOAD",
        message: "Enter your city, for example Chennai, Dubai or London.",
      },
    };
  }

  const country = normaliseCountry(body.country);
  if (!country) {
    return {
      ok: false,
      error: {
        code: "INVALID_PAYLOAD",
        message: "Enter your country, for example India, Singapore or United Kingdom.",
      },
    };
  }

  const rawReferral = body.referredBy ?? body.ref;
  const referredBy = normaliseReferralCode(rawReferral);
  if (typeof rawReferral === "string" && rawReferral.trim() && !referredBy) {
    return {
      ok: false,
      error: {
        code: "INVALID_PAYLOAD",
        message: "Enter a valid referral code using 4–16 letters or numbers.",
      },
    };
  }

  return {
    ok: true,
    value: {
      email,
      name: normaliseName(body.name),
      city,
      country,
      referredBy,
    },
  };
}
