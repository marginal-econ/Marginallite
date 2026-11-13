export const DEFAULT_SETTINGS = {
  heroTitle: "Why do strong Economics responses still miss the top band?",
  heroHighlight: "That is the question we are answering.",
  heroDescription:
    "Marginalite is the complete Cambridge 0455 Economics mastery platform — uniting line-by-line AI Response Grading, Paper 1 MCQ question banks, and causal transmission structuring grounded in official Cambridge mark schemes.",
  heroNotice:
    "Unlimited response evaluations and past paper MCQ drills. Instant AO1/AO2/AO3 breakdowns, syllabus citations, and line-by-line mark scheme matching.",
  joinTitle: "Master Cambridge 0455 Economics.",
  joinDescription:
    "Bring one response you're unsure about, and you'll know within seconds which assessment objective and causal chain is costing you the top grade.",
  cta: "Start Free Today",
  successMessage: "You're all set!",
  closedMessage: "Signups are paused for now. Please check back soon.",
  signupOpen: true,
  requireName: true,
  blockedDomains: [] as string[],
};
export type SiteSettings = typeof DEFAULT_SETTINGS;
export type PublicSettings = Omit<SiteSettings, "blockedDomains">;
export const TEXT_LIMITS = {
  heroTitle: 160,
  heroHighlight: 100,
  heroDescription: 1000,
  heroNotice: 600,
  joinTitle: 160,
  joinDescription: 1000,
  cta: 60,
  successMessage: 300,
  closedMessage: 300,
} as const;
export function publicSettings(settings: SiteSettings): PublicSettings {
  const { blockedDomains: _, ...visible } = settings;
  return visible;
}
export function validateSettings(value: unknown): SiteSettings {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Send a settings object.");
  const body = value as Record<string, unknown>;
  const result = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(TEXT_LIMITS) as (keyof typeof TEXT_LIMITS)[]) {
    const text = body[key];
    if (typeof text !== "string" || !text.trim() || text.trim().length > TEXT_LIMITS[key]) {
      throw new Error(`${key} must contain 1–${TEXT_LIMITS[key]} characters.`);
    }
    result[key] = text.trim();
  }
  for (const key of ["signupOpen", "requireName"] as const) {
    if (typeof body[key] !== "boolean") throw new Error(`${key} must be true or false.`);
    result[key] = body[key];
  }
  if (!Array.isArray(body.blockedDomains) || body.blockedDomains.length > 200)
    throw new Error("Use at most 200 blocked domains.");
  result.blockedDomains = [
    ...new Set(
      body.blockedDomains.map((item: unknown) => {
        if (typeof item !== "string") throw new Error("Enter domain names only.");
        const domain = item.trim().toLowerCase();
        if (
          domain.length > 253 ||
          !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)
        ) {
          throw new Error(
            `Invalid domain: ${domain.slice(0, 60)}. Use a domain such as example.com.`,
          );
        }
        return domain;
      }),
    ),
  ];
  return result;
}
export function matchesBlockedDomain(email: string, domains: string[]): boolean {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  return domains.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));
}
