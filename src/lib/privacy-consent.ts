export const CONSENT_VERSION = 1;
export const CONSENT_EVENT = "marginalite:consent-changed";

export type ConsentChoice = {
  version: number;
  essential: true;
  analytics: boolean;
  savedAt: string;
};

export function privacyConsentStorageKey(userId: string) {
  return `marginalite.privacyConsent.v${CONSENT_VERSION}:${userId}`;
}

export function readPrivacyConsent(userId: string): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(privacyConsentStorageKey(userId));
    const saved = raw ? (JSON.parse(raw) as Partial<ConsentChoice>) : null;
    return saved?.version === CONSENT_VERSION && saved.essential === true
      ? (saved as ConsentChoice)
      : null;
  } catch {
    return null;
  }
}
