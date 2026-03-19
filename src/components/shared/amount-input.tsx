"use client";
import { Input } from "@/components/ui/input";
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
  return (
    <div className="flex gap-2">
      <Input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <CurrencySelect value={currency} onChange={onCurrencyChange} />
    </div>
  );
}
