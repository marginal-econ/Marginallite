import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bug,
  CheckCircle2,
  Handshake,
  HelpCircle,
  LifeBuoy,
  Loader2,
  LockKeyhole,
  MessageSquare,
  Paperclip,
  Send,
  Settings,
  School,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

import { SiteFooter } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & contact — Marginalite" },
      {
        name: "description",
        content:
          "Contact Marginalite about technical problems, bugs, partnerships, accounts, privacy, or general questions.",
      },
    ],
  }),
  component: HelpPage,
});

const CATEGORIES = [
  { value: "general", label: "General question", icon: MessageSquare },
  { value: "technical", label: "Technical error", icon: Settings },
  { value: "bug", label: "Found a bug", icon: Bug },
  { value: "partnership", label: "Partnership", icon: Handshake },
  { value: "account", label: "Account or privacy", icon: LockKeyhole },
  { value: "teacher", label: "Teacher or school enquiry", icon: School },
  { value: "feedback", label: "Feedback or suggestion", icon: HelpCircle },
] as const;

type FormState = {
  name: string;
  email: string;
  category: (typeof CATEGORIES)[number]["value"];
  subject: string;
  message: string;
  pageUrl: string;
  company: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  category: "general",
  subject: "",
  message: "",
  pageUrl: "",
  company: "",
};

async function encodeAttachment(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
  return {
    filename: file.name,
    contentType: file.type,
    base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
  };
}

function HelpPage() {
  const startedAt = useRef(Date.now());
  const attachmentInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const selected = CATEGORIES.find((category) => category.value === form.category)!;
  const SelectedIcon = selected.icon;
  const needsPage = form.category === "technical" || form.category === "bug";
  const formComplete =
    form.name.trim().length >= 2 &&
    form.email.trim().length > 0 &&
    form.subject.trim().length >= 3 &&
    form.message.trim().length >= 20 &&
    (!needsPage || form.pageUrl.trim().length > 0);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (state === "error") setState("idle");
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("sending");
    setError("");
    try {
      const encodedAttachments = await Promise.all(attachments.map(encodeAttachment));
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          attachments: encodedAttachments,
          startedAt: startedAt.current,
        }),
      });
      const result = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !result.success) throw new Error(result.message || "Message not sent.");
      setState("sent");
      setForm(EMPTY_FORM);
      setAttachments([]);
      startedAt.current = Date.now();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Message not sent. Please try again.");
      setState("error");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 md:px-8">
          <Link to="/" className="group flex items-center gap-2.5">
            <img
              src="/marginalite-mark.svg"
              alt=""
              aria-hidden="true"
              className="size-9 object-contain transition-transform duration-300 group-hover:-rotate-6"
            />
            <span className="font-semibold">Marginalite</span>
          </Link>
          <Link
            to="/"
            className="pop-sm pop-press inline-flex items-center gap-1.5 bg-surface px-3 py-2 text-sm font-semibold"
          >
            <ArrowLeft className="size-4" /> Back to site
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border bg-plum text-plum-foreground">
          <div className="paper-grid pointer-events-none absolute inset-0 opacity-20" />
          <div className="relative mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
            <p className="eyebrow text-plum-foreground/65">Help &amp; contact</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold text-balance md:text-6xl">
              Tell us what you need. We’ll get it to the right place.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-plum-foreground/75 md:text-lg">
              Questions, technical problems, partnership ideas and account requests are all welcome.
              You do not need to contact a school first.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-6 px-5 py-8 md:px-8 md:py-12 lg:grid-cols-[0.55fr_1.45fr]">
          <aside className="space-y-5">
            <div className="pop bg-surface p-6">
              <span className="pop-sm flex size-11 items-center justify-center bg-primary/15 text-primary">
                <LifeBuoy className="size-5" />
              </span>
              <h2 className="mt-5 text-xl font-bold">A real support request</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Your message goes directly to the Marginalite team. Replies will be sent to the email
                address you provide.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <p className="text-sm font-semibold">Include useful details</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• What you expected to happen</li>
                <li>• What happened instead</li>
                <li>• The page where it happened</li>
                <li>• Never send passwords or verification codes</li>
              </ul>
            </div>
          </aside>

          <div className="pop bg-surface p-6 md:p-8">
            {state === "sent" ? (
              <div className="flex min-h-[30rem] flex-col items-center justify-center text-center">
                <span className="pop flex size-16 items-center justify-center bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="size-8" />
                </span>
                <h2 className="mt-6 text-2xl font-bold">Message sent</h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Thanks for contacting Marginalite. We’ll reply to your email after reviewing the
                  details.
                </p>
                <Button className="mt-6" variant="outline" onClick={() => setState("idle")}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <p className="eyebrow eyebrow-accent">New message</p>
                  <h2 className="mt-2 text-2xl font-bold">How can we help?</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="help-name">
                      Your name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="help-name"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={100}
                      value={form.name}
                      onChange={(event) => update("name", event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="help-email">
                      Email address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="help-email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      value={form.email}
                      onChange={(event) => update("email", event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="help-category">
                    What is this about? <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.category}
                    onValueChange={(value) => update("category", value)}
                  >
                    <SelectTrigger
                      id="help-category"
                      className="h-11 justify-start gap-2 [&>svg:last-child]:ml-auto [&>span]:line-clamp-none"
                    >
                      <SelectedIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <SelectValue aria-label={selected.label}>{selected.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(({ value, label, icon: Icon }) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            <Icon className="size-4" />
                            {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="help-subject">
                    Subject <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="help-subject"
                    required
                    minLength={3}
                    maxLength={140}
                    placeholder="A short summary"
                    value={form.subject}
                    onChange={(event) => update("subject", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="help-message">
                    Message <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="help-message"
                    required
                    minLength={20}
                    maxLength={4000}
                    rows={7}
                    placeholder="Give us enough detail to understand and reproduce the problem."
                    value={form.message}
                    onChange={(event) => update("message", event.target.value)}
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {form.message.length} / 4000
                  </p>
                </div>
                {needsPage ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="help-page">
                      Affected page <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="help-page"
                      type="url"
                      required
                      maxLength={500}
                      placeholder="https://…"
                      value={form.pageUrl}
                      onChange={(event) => update("pageUrl", event.target.value)}
                    />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label>
                    Attachments{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <input
                    ref={attachmentInput}
                    type="file"
                    className="sr-only"
                    accept="image/*,.heic,.heif,.pdf,.doc,.docx,.txt"
                    multiple
                    onChange={(event) => {
                      const selectedFiles = Array.from(event.target.files ?? []);
                      const oversized = selectedFiles.find((file) => file.size > 5 * 1024 * 1024);
                      if (oversized) {
                        setError(`${oversized.name} is larger than 5 MB.`);
                        setState("error");
                        event.target.value = "";
                        return;
                      }
                      setAttachments((current) => [...current, ...selectedFiles].slice(0, 3));
                      event.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => attachmentInput.current?.click()}
                    disabled={attachments.length >= 3}
                  >
                    <Paperclip className="size-4" /> Add image or file
                  </Button>
                  {attachments.length ? (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div
                          key={`${file.name}-${file.size}-${index}`}
                          className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                        >
                          <Paperclip className="size-4 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${file.name}`}
                            onClick={() =>
                              setAttachments((current) =>
                                current.filter((_, fileIndex) => fileIndex !== index),
                              )
                            }
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        Up to 3 images or documents, 5 MB each.
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="absolute -left-[10000px]" aria-hidden="true">
                  <Label htmlFor="help-company">Company</Label>
                  <Input
                    id="help-company"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.company}
                    onChange={(event) => update("company", event.target.value)}
                  />
                </div>
                {state === "error" ? (
                  <p
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                  >
                    {error}
                  </p>
                ) : null}
                <Button
                  size="lg"
                  disabled={state === "sending" || !formComplete}
                  className="w-full sm:w-auto"
                >
                  {state === "sending" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {state === "sending" ? "Sending…" : "Send message"}
                </Button>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  By sending this form, you agree that we may use these details to respond to your
                  request. Please do not include passwords, OTP codes, or sensitive school records.
                </p>
              </form>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
