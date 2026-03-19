"use client";
import { useState, useCallback } from "react";
import Decimal from "decimal.js";
import {
  calculateEqual,
  calculatePercentage,
  calculateValue,
  calculateLock,
} from "@/lib/splitting";
import type { SplitResult, SplitInput } from "@/lib/splitting";

export type SplitMode = "EQUAL" | "PERCENTAGE" | "VALUE" | "LOCK";

export function useSplitCalculator(total: string, memberIds: string[]) {
  const [mode, setMode] = useState<SplitMode>("EQUAL");
  const [inputs, setInputs] = useState<SplitInput[]>(() =>
    memberIds.map((id) => ({ userId: id, isLocked: false }))
  );
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback((): SplitResult[] => {
    setError(null);
    if (!total || parseFloat(total) <= 0) return [];
    try {
      const t = new Decimal(total);
      if (mode === "EQUAL") return calculateEqual(t, inputs.map((i) => i.userId));
      if (mode === "PERCENTAGE") return calculatePercentage(t, inputs);
      if (mode === "VALUE") return calculateValue(t, inputs);
      if (mode === "LOCK") return calculateLock(t, inputs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Split calculation error");
    }
    return [];
  }, [total, mode, inputs]);

  return { mode, setMode, inputs, setInputs, calculate, error };
}
