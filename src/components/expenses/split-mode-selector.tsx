"use client";
import { useTranslations } from "next-intl";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SplitMode } from "@/types/database";

interface SplitModeSelectorProps {
  value: SplitMode;
  onChange: (v: SplitMode) => void;
}

export function SplitModeSelector({ value, onChange }: SplitModeSelectorProps) {
  const t = useTranslations("expenses");
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as SplitMode)}>
      <TabsList className="flex w-full">
        <TabsTrigger value="LOCK" className="flex-1 text-xs sm:text-sm">
          {t("splitModeAmount")}
        </TabsTrigger>
        <TabsTrigger value="PERCENTAGE" className="flex-1 text-xs sm:text-sm">
          %
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
