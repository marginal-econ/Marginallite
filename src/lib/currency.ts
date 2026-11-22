/**
 * Multi-Currency Engine for Marginal Cambridge Economics (9708).
 * Provides live currency conversion, localized symbols, formatting,
 * persistence, and multi-currency matrix representations for students and administrators.
 */

export type CurrencyCode = "USD" | "INR" | "GBP" | "EUR" | "SGD" | "AED" | "CAD" | "AUD";

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  rateAgainstUsd: number; // 1 USD = X target currency
  symbolPosition: "prefix" | "suffix";
  sampleRegion: string;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    flag: "🇺🇸",
    rateAgainstUsd: 1.0,
    symbolPosition: "prefix",
    sampleRegion: "Global / Americas / International",
  },
  INR: {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
    flag: "🇮🇳",
    rateAgainstUsd: 85.0,
    symbolPosition: "prefix",
    sampleRegion: "India & South Asia",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    flag: "🇬🇧",
    rateAgainstUsd: 0.79,
    symbolPosition: "prefix",
    sampleRegion: "United Kingdom & British Int'l Schools",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    flag: "🇪🇺",
    rateAgainstUsd: 0.92,
    symbolPosition: "prefix",
    sampleRegion: "European Union & International Schools",
  },
  SGD: {
    code: "SGD",
    symbol: "S$",
    name: "Singapore Dollar",
    flag: "🇸🇬",
    rateAgainstUsd: 1.35,
    symbolPosition: "prefix",
    sampleRegion: "Singapore (Cambridge Singapore-Cambridge GCE)",
  },
  AED: {
    code: "AED",
    symbol: "AED ",
    name: "UAE Dirham",
    flag: "🇦🇪",
    rateAgainstUsd: 3.67,
    symbolPosition: "prefix",
    sampleRegion: "Dubai, Abu Dhabi & Middle East",
  },
  CAD: {
    code: "CAD",
    symbol: "CA$",
    name: "Canadian Dollar",
    flag: "🇨🇦",
    rateAgainstUsd: 1.38,
    symbolPosition: "prefix",
    sampleRegion: "Canada",
  },
  AUD: {
    code: "AUD",
    symbol: "AU$",
    name: "Australian Dollar",
    flag: "🇦🇺",
    rateAgainstUsd: 1.55,
    symbolPosition: "prefix",
    sampleRegion: "Australia & Oceania",
  },
};

export const CURRENCY_LIST = Object.values(SUPPORTED_CURRENCIES);

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

const STORAGE_KEY = "marginal_currency_preference";

/**
 * Clean localized integer/charm rounding for student pricing:
 * USD: $19, $35, $59, $99, $179
 * INR: ₹1,599, ₹2,999, ₹4,999, etc.
 * GBP: £15, £28, £47, etc.
 * EUR: €18, €32, €55, etc.
 */
export function convertFromUsd(amountInUsd: number, targetCurrency: CurrencyCode): number {
  if (amountInUsd === 0) return 0;
  const meta = SUPPORTED_CURRENCIES[targetCurrency] || SUPPORTED_CURRENCIES.USD;
  const raw = amountInUsd * meta.rateAgainstUsd;

  if (targetCurrency === "INR") {
    // Round to clean psychological price point ending in 99 or nearest 100 for big figures
    if (raw < 1000) {
      return Math.round(raw / 10) * 10;
    }
    // E.g. 1615 -> 1599, 2975 -> 2999, 5015 -> 4999
    const hundreds = Math.round(raw / 100) * 100;
    return hundreds > 100 ? hundreds - 1 : hundreds;
  }

  if (targetCurrency === "AED") {
    return Math.round(raw);
  }

  // Western currencies (USD, GBP, EUR, SGD, CAD, AUD): round to whole integer
  return Math.round(raw);
}

/**
 * Format a USD base amount in the target currency with proper symbol and grouping.
 */
export function formatCurrencyAmount(
  amountInUsd: number,
  currencyCode: CurrencyCode = "USD",
  options?: { showFree?: boolean; compact?: boolean },
): string {
  if (amountInUsd === 0 && options?.showFree) {
    return "Free";
  }

  const meta = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.USD;
  const converted = convertFromUsd(amountInUsd, currencyCode);

  const formattedNumber = converted.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });

  if (meta.symbolPosition === "suffix") {
    return `${formattedNumber} ${meta.symbol.trim()}`;
  }
  return `${meta.symbol}${formattedNumber}`;
}

export interface MultiCurrencyBreakdownItem {
  code: CurrencyCode;
  symbol: string;
  flag: string;
  name: string;
  amount: number;
  formatted: string;
}

/**
 * Returns the price calculated simultaneously across all supported currencies (for Admin & global comparison).
 */
export function getAllCurrencyBreakdowns(amountInUsd: number): MultiCurrencyBreakdownItem[] {
  return CURRENCY_LIST.map((meta) => {
    const amount = convertFromUsd(amountInUsd, meta.code);
    return {
      code: meta.code,
      symbol: meta.symbol,
      flag: meta.flag,
      name: meta.name,
      amount,
      formatted: formatCurrencyAmount(amountInUsd, meta.code),
    };
  });
}

/**
 * Browser-side currency retrieval with localStorage fallback.
 */
export function getStoredCurrency(): CurrencyCode {
  if (typeof window === "undefined") return DEFAULT_CURRENCY;
  try {
    const val = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    if (val && val in SUPPORTED_CURRENCIES) {
      return val;
    }
  } catch {
    // Ignore localStorage access issues
  }
  return DEFAULT_CURRENCY;
}

/**
 * Browser-side currency persistence + event dispatch for instant multi-component reactivity.
 */
export function setStoredCurrency(code: CurrencyCode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
    window.dispatchEvent(new CustomEvent("marginal:currency-changed", { detail: { currency: code } }));
  } catch {
    // Ignore
  }
}
