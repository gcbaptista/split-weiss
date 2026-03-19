"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SplitMode } from "@/hooks/use-split-calculator";

interface SplitModeSelectorProps {
  value: SplitMode;
  onChange: (v: SplitMode) => void;
}

export function SplitModeSelector({ value, onChange }: SplitModeSelectorProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as SplitMode)}>
      <TabsList className="flex w-full">
        <TabsTrigger value="LOCK" className="flex-1 text-xs sm:text-sm">Amount</TabsTrigger>
        <TabsTrigger value="PERCENTAGE" className="flex-1 text-xs sm:text-sm">%</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
