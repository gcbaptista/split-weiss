"use client";
import { Input } from "@/components/ui/input";
import { CURRENCY_SYMBOLS } from "@/lib/currency/constants";

import { CurrencySelect } from "./currency-select";

interface AmountInputProps {
  value: string;
  onChange: (v: string) => void;
  currency: string;
  onCurrencyChange: (c: string) => void;
  placeholder?: string;
}

export function AmountInput({
  value,
  onChange,
  currency,
  onCurrencyChange,
  placeholder = "0.00",
}: AmountInputProps) {
  const symbol = CURRENCY_SYMBOLS[currency];

  function handleChange(raw: string) {
    // Allow digits, one decimal point, and nothing else
    const clean = raw.replace(/[^0-9.]/g, "").replace(/^(\d*\.?\d*).*$/, "$1");
    onChange(clean);
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        {symbol && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
            {symbol}
          </span>
        )}
        <Input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          // text-base prevents iOS from auto-zooming into inputs with font-size < 16px
          className={`text-base ${symbol ? "pl-7" : ""}`}
        />
      </div>
      <CurrencySelect value={currency} onChange={onCurrencyChange} />
    </div>
  );
}
