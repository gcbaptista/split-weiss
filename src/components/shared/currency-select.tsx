"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES, CURRENCY_NAMES } from "@/lib/currency/constants";

interface CurrencySelectProps {
  value: string;
  onChange: (v: string) => void;
}

export function CurrencySelect({ value, onChange }: CurrencySelectProps) {
  return (
    <Select value={value} onValueChange={(v) => v !== null && onChange(v)}>
      <SelectTrigger className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {CURRENCIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c} {CURRENCY_NAMES[c] ? `· ${CURRENCY_NAMES[c]}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
