import { useEffect, useState, useCallback } from "react";
import {
  DEFAULT_CURRENCY,
  getStoredCurrency,
  setStoredCurrency,
  formatCurrencyAmount,
  convertFromUsd,
  getAllCurrencyBreakdowns,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  type CurrencyMeta,
} from "@/lib/currency";

export function useCurrency() {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  useEffect(() => {
    // Sync initial state from localStorage after mount
    setCurrencyState(getStoredCurrency());

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ currency: CurrencyCode }>;
      if (customEvent.detail?.currency) {
        setCurrencyState(customEvent.detail.currency);
      }
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === "marginal_currency_preference" && event.newValue) {
        if (event.newValue in SUPPORTED_CURRENCIES) {
          setCurrencyState(event.newValue as CurrencyCode);
        }
      }
    };

    window.addEventListener("marginal:currency-changed", handleCustomEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener("marginal:currency-changed", handleCustomEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    setStoredCurrency(code);
  }, []);

  const meta: CurrencyMeta = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;

  return {
    currency,
    setCurrency,
    meta,
    format: (amountInUsd: number, options?: { showFree?: boolean; compact?: boolean }) =>
      formatCurrencyAmount(amountInUsd, currency, options),
    convert: (amountInUsd: number) => convertFromUsd(amountInUsd, currency),
    allBreakdowns: (amountInUsd: number) => getAllCurrencyBreakdowns(amountInUsd),
    supportedCurrencies: SUPPORTED_CURRENCIES,
  };
}
