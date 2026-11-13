/**
 * Referral-code generation.
 *
 * `crypto.getRandomValues` rather than `Math.random()`: these codes are the
 * only handle anyone has on a waitlist row, and `Math.random()` is a seeded
 * PRNG whose output is predictable from a handful of prior samples. Web
 * Crypto is available on Workers, in Node 18+ and in the browser, so there is
 * no platform-specific branch to maintain.
 */

/**
 * Crockford-ish alphabet: no 0/O, no 1/I/L. A code has to survive being read
 * off one phone screen and typed into another, which is the entire job of a
 * referral code.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 7;

/** 31 * 8 = 248. Bytes at or above it would over-represent the first 8 letters. */
const REJECTION_CEILING = 248;

export function generateReferralCode(length: number = CODE_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let out = "";
  for (let i = 0; i < length; i += 1) {
    let value = bytes[i] as number;
    // Modulo bias removed by redrawing rather than by folding — cheap here,
    // and it keeps the distribution over the alphabet exactly uniform.
    while (value >= REJECTION_CEILING) {
      const retry = new Uint8Array(1);
      crypto.getRandomValues(retry);
      value = retry[0] as number;
    }
    out += ALPHABET[value % ALPHABET.length];
  }
  return out;
}

/**
 * Constant-time string comparison, used for the admin key.
 *
 * A plain `===` on secrets leaks their prefix through timing. This always
 * walks the full length of the longer string.
 */
export function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length);

  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}
