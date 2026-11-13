import disposableDomains from "disposable-email-domains";

// Keep a small local supplement for newly observed providers that have not yet
// landed in the upstream list. The package is updated independently, while
// this ensures known abuse is blocked immediately.
const supplementalDomains = ["hideam.com", "jobscai.com"];

const blockedDomains = new Set<string>([...disposableDomains, ...supplementalDomains]);

export function isDisposableEmail(email: string): boolean {
  const domain = email
    .slice(email.lastIndexOf("@") + 1)
    .trim()
    .toLowerCase();
  if (!domain) return false;

  // Check the exact host and its parent domains so disposable providers cannot
  // evade the rule by issuing addresses on arbitrary subdomains.
  const labels = domain.split(".");
  for (let index = 0; index < labels.length - 1; index += 1) {
    if (blockedDomains.has(labels.slice(index).join("."))) return true;
  }
  return false;
}
