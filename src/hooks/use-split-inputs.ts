import Decimal from "decimal.js";
import { useState } from "react";

import { calculateLock, calculatePercentage, type SplitResult } from "@/lib/splitting";
import type { ExpenseWithSplitsClient, MemberSummary, SplitMode } from "@/types/database";

export interface SplitInputState {
  userId: string;
  amount: string;
  percentage: string;
  isLocked: boolean;
  isIncluded: boolean;
}

interface UseSplitInputsOptions {
  members: MemberSummary[];
  initialExpense?: ExpenseWithSplitsClient;
  errorMessage: string;
  genericErrorMessage: string;
}

export function useSplitInputs({
  members,
  initialExpense,
  errorMessage,
  genericErrorMessage,
}: UseSplitInputsOptions) {
  const [splitMode, setSplitMode] = useState<SplitMode>(
    (initialExpense?.splitMode as SplitMode) ?? "LOCK"
  );

  const [splitInputs, setSplitInputs] = useState<SplitInputState[]>(() =>
    members.map((m) => {
      const s = initialExpense?.splits.find((sp) => sp.userId === m.id);
      return {
        userId: m.id,
        amount: s?.amount ?? "",
        percentage: s?.percentage ?? "",
        isLocked: s?.isLocked ?? false,
        isIncluded: initialExpense ? s !== undefined : true,
      };
    })
  );

  function handleModeChange(newMode: SplitMode) {
    if (newMode === "PERCENTAGE") {
      setSplitInputs((prev) => {
        const included = prev.filter((s) => s.isIncluded);
        const n = included.length || prev.length;
        const base = new Decimal(100).div(n).toDecimalPlaces(2, Decimal.ROUND_DOWN);
        const remainder = new Decimal(100).minus(base.times(n - 1));
        let idx = 0;
        return prev.map((s) => {
          if (!s.isIncluded) return { ...s, percentage: "", isLocked: false };
          const pct = idx === n - 1 ? remainder : base;
          idx++;
          return { ...s, percentage: pct.toString(), isLocked: false };
        });
      });
    }
    setSplitMode(newMode);
  }

  function computeSplits(watchAmount: string): { splits: SplitResult[] | null; splitError: string | null } {
    if (!watchAmount || parseFloat(watchAmount) <= 0) return { splits: null, splitError: null };
    try {
      const total = new Decimal(watchAmount);
      let result;
      if (splitMode === "PERCENTAGE") {
        const includedInputs = splitInputs
          .filter((s) => s.isIncluded)
          .map((s) => ({ userId: s.userId, percentage: s.percentage, isLocked: s.isLocked }));
        if (includedInputs.length === 0)
          return { splits: null, splitError: errorMessage };
        result = calculatePercentage(total, includedInputs);
      } else {
        const includedInputs = splitInputs
          .filter((s) => s.isIncluded)
          .map((s) => ({ userId: s.userId, amount: s.amount, isLocked: s.isLocked }));
        if (includedInputs.length === 0)
          return { splits: null, splitError: errorMessage };
        result = calculateLock(total, includedInputs);
      }
      return { splits: result, splitError: null };
    } catch (e) {
      return { splits: null, splitError: e instanceof Error ? e.message : genericErrorMessage };
    }
  }

  return {
    splitMode,
    splitInputs,
    setSplitInputs,
    handleModeChange,
    computeSplits,
  };
}
