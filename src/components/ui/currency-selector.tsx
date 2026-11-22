import * as React from "react";
import { Globe } from "lucide-react";
import {
  CURRENCY_LIST,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from "@/lib/currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CurrencySelectorProps {
  value: CurrencyCode;
  onChange: (value: CurrencyCode) => void;
  className?: string;
  variant?: "pill-row" | "select" | "compact";
  showLabel?: boolean;
}

export function CurrencySelector({
  value,
  onChange,
  className,
  variant = "select",
  showLabel = true,
}: CurrencySelectorProps) {
  if (variant === "pill-row") {
    // Top 4 most frequent Cambridge currencies for quick 1-click toggling + select for more
    const topCurrencies: CurrencyCode[] = ["USD", "INR", "GBP", "EUR", "SGD", "AED"];

    return (
      <div className={cn("inline-flex items-center gap-1.5 p-1 rounded-full border border-border/80 bg-muted/40 shadow-xs", className)}>
        {showLabel && (
          <div className="flex items-center gap-1 pl-2 pr-1 text-[11px] font-semibold text-muted-foreground shrink-0">
            <Globe className="size-3.5 text-primary" />
            <span className="hidden sm:inline">Currency:</span>
          </div>
        )}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {topCurrencies.map((code) => {
            const meta = SUPPORTED_CURRENCIES[code];
            const isSelected = value === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => onChange(code)}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer flex items-center gap-1 shrink-0",
                  isSelected
                    ? "bg-background text-foreground shadow-xs font-bold border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                )}
                title={`${meta.name} (${meta.symbol.trim()})`}
              >
                <span>{meta.flag}</span>
                <span className="font-mono text-[11px]">{code}</span>
                <span className="text-muted-foreground font-sans text-[10px]">({meta.symbol.trim()})</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Dropdown Select variant
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 shrink-0">
          <Globe className="size-3 text-primary" />
          <span className="hidden sm:inline">Currency:</span>
        </span>
      )}
      <Select value={value} onValueChange={(val) => onChange(val as CurrencyCode)}>
        <SelectTrigger className="h-8 text-xs font-semibold bg-background/90 border-border/80 min-w-[130px] rounded-lg shadow-xs cursor-pointer">
          <SelectValue>
            <span className="inline-flex items-center gap-1.5">
              <span>{SUPPORTED_CURRENCIES[value]?.flag}</span>
              <span className="font-bold">{value}</span>
              <span className="text-muted-foreground font-normal">
                ({SUPPORTED_CURRENCIES[value]?.symbol.trim()})
              </span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end" className="w-[220px]">
          {CURRENCY_LIST.map((c) => (
            <SelectItem key={c.code} value={c.code} className="text-xs cursor-pointer py-1.5">
              <div className="flex items-center justify-between w-full gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm">{c.flag}</span>
                  <span className="font-bold">{c.code}</span>
                  <span className="text-muted-foreground">({c.symbol.trim()})</span>
                </span>
                <span className="text-[10px] text-muted-foreground/80 truncate max-w-[80px]">
                  {c.name}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
