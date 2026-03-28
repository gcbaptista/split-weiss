"use client";

import Decimal from "decimal.js";
import { AlertCircle, Lock, LockOpen } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CURRENCY_SYMBOLS } from "@/lib/currency/constants";
import type { SplitResult } from "@/lib/splitting";
import type { MemberSummary, SplitMode } from "@/types/database";
import type { SplitInputState } from "@/hooks/use-split-inputs";

import { SplitModeSelector } from "./split-mode-selector";

const BAR_COLORS = [
  "bg-blue-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-violet-400",
  "bg-cyan-400",
  "bg-orange-400",
  "bg-pink-400",
];

function SplitPreviewBar({ splits }: { splits: SplitResult[] }) {
  const total = splits.reduce((s, m) => s.plus(m.amount), new Decimal(0));
  if (total.lte(0)) return null;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
      {splits.map((s, i) => {
        const pct = s.amount.div(total).mul(100).toFixed(1);
        return (
          <div
            key={s.userId}
            style={{ width: `${pct}%` }}
            className={BAR_COLORS[i % BAR_COLORS.length]}
          />
        );
      })}
    </div>
  );
}

interface SplitEditorProps {
  members: MemberSummary[];
  splitMode: SplitMode;
  onModeChange: (mode: SplitMode) => void;
  splitInputs: SplitInputState[];
  setSplitInputs: React.Dispatch<React.SetStateAction<SplitInputState[]>>;
  splits: SplitResult[] | null;
  splitError: string | null;
  currency: string;
  hasAmount: boolean;
}

export function SplitEditor({
  members,
  splitMode,
  onModeChange,
  splitInputs,
  setSplitInputs,
  splits,
  splitError,
  currency,
  hasAmount,
}: SplitEditorProps) {
  const t = useTranslations("expenses");
  const isPercentage = splitMode === "PERCENTAGE";

  function handleToggleInclude(index: number, included: boolean) {
    setSplitInputs((prev) =>
      prev.map((s, j) =>
        j === index ? { ...s, isIncluded: included, isLocked: included ? s.isLocked : false } : s
      )
    );
  }

  function handleToggleLock(index: number) {
    setSplitInputs((prev) =>
      prev.map((s, j) => (j === index ? { ...s, isLocked: !s.isLocked } : s))
    );
  }

  function handleAmountChange(index: number, value: string) {
    setSplitInputs((prev) =>
      prev.map((s, j) =>
        j === index ? { ...s, amount: value, isLocked: true } : s
      )
    );
  }

  function handlePercentageChange(index: number, value: string) {
    setSplitInputs((prev) => {
      const updated = prev.map((s, j) =>
        j === index ? { ...s, percentage: value, isLocked: true } : s
      );
      // Redistribute remaining percentage among unlocked included rows
      const lockedSum = updated
        .filter((s) => s.isIncluded && s.isLocked)
        .reduce((sum, s) => {
          const p = s.percentage?.trim();
          return sum.plus(new Decimal(p && !isNaN(Number(p)) ? p : "0"));
        }, new Decimal(0));
      const unlockedIncluded = updated.filter((s) => s.isIncluded && !s.isLocked);
      if (unlockedIncluded.length > 0) {
        const remaining = Decimal.max(new Decimal(0), new Decimal(100).minus(lockedSum));
        const each = remaining.div(unlockedIncluded.length).toDecimalPlaces(2, Decimal.ROUND_DOWN);
        const lastAdj = remaining.minus(each.times(unlockedIncluded.length - 1));
        let idx = 0;
        return updated.map((s) => {
          if (s.isIncluded && !s.isLocked) {
            const pct = idx === unlockedIncluded.length - 1 ? lastAdj : each;
            idx++;
            return { ...s, percentage: pct.toString() };
          }
          return s;
        });
      }
      return updated;
    });
  }

  return (
    <div className="space-y-3">
      <Label>{t("split")}</Label>
      <SplitModeSelector value={splitMode} onChange={onModeChange} />

      <div className="space-y-2">
        {members.map((m, i) => {
          const input = splitInputs[i]!;
          const isIncluded = input.isIncluded;
          const isLocked = input.isLocked;
          const computedAmount = splits?.find((s) => s.userId === m.id)?.amount;
          const idPrefix = isPercentage ? `pct-include-${m.id}` : `include-${m.id}`;


          return (
            <div
              key={m.id}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 transition-opacity ${!isIncluded ? "opacity-40" : ""}`}
            >
              <label
                htmlFor={idPrefix}
                className="min-w-0 flex-1 truncate text-sm font-medium cursor-pointer"
              >
                {m.name}
              </label>
              <Switch
                id={idPrefix}
                checked={isIncluded}
                onCheckedChange={(v) => handleToggleInclude(i, v)}
              />
              <div className="flex items-center gap-1">
                {isPercentage ? (
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    disabled={!isIncluded}
                    value={input.percentage}
                    onChange={(e) => handlePercentageChange(i, e.target.value)}
                    className="w-20 text-right"
                  />
                ) : (
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    disabled={!isIncluded}
                    value={isLocked ? input.amount : (computedAmount?.toFixed(2) ?? "")}
                    onChange={(e) => handleAmountChange(i, e.target.value)}
                    className="w-20 text-right"
                  />
                )}
                <span className="text-sm text-muted-foreground shrink-0">
                  {isPercentage ? "%" : (CURRENCY_SYMBOLS[currency] ?? currency)}
                </span>
              </div>
              <button
                type="button"
                disabled={!isIncluded}
                onClick={() => handleToggleLock(i)}
                className="shrink-0 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30 transition-colors"
                aria-label={isLocked ? (isPercentage ? "Unlock percentage" : "Unlock amount") : (isPercentage ? "Lock percentage" : "Lock amount")}
              >
                {isLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
      </div>

      {splits && hasAmount && <SplitPreviewBar splits={splits} />}
      {splitError && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {splitError}
        </p>
      )}
    </div>
  );
}