"use client";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createExpenseSchema,
  type CreateExpenseInput,
} from "@/lib/validations/expense.schema";
import { createExpense, updateExpense } from "@/app/actions/expense.actions";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/shared/amount-input";
import { SplitModeSelector } from "./split-mode-selector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  calculatePercentage,
  calculateLock,
} from "@/lib/splitting";
import Decimal from "decimal.js";
import type { UserSummary, ExpenseWithSplitsClient } from "@/types/database";
import type { SplitMode } from "@/hooks/use-split-calculator";
import { CURRENCY_SYMBOLS } from "@/lib/currency/constants";
import { AlertCircle, Lock, LockOpen } from "lucide-react";

const BAR_COLORS = [
  "bg-blue-400", "bg-emerald-400", "bg-amber-400", "bg-rose-400",
  "bg-violet-400", "bg-cyan-400", "bg-orange-400", "bg-pink-400",
];

function SplitPreviewBar({
  splits,
}: {
  splits: { userId: string; amount: Decimal }[];
}) {
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

interface ExpenseFormProps {
  groupId: string;
  members: UserSummary[];
  groupCurrency: string;
  defaultPayerId: string;
  onSuccess?: () => void;
  expenseId?: string;
  initialExpense?: ExpenseWithSplitsClient;
}

interface SplitInputState {
  userId: string;
  amount: string;
  percentage: string;
  isLocked: boolean;
  isIncluded: boolean;
}

export function ExpenseForm({
  groupId,
  members,
  groupCurrency,
  defaultPayerId,
  onSuccess,
  expenseId,
  initialExpense,
}: ExpenseFormProps) {
  const router = useRouter();
  const [currency, setCurrency] = useState(initialExpense?.currency ?? groupCurrency);
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
  const form = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      groupId,
      title: initialExpense?.title ?? "",
      amount: initialExpense?.amount ?? "",
      currency,
      splitMode: (initialExpense?.splitMode as SplitMode) ?? "LOCK",
      date: initialExpense
        ? new Date(initialExpense.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      payerId: initialExpense?.payerId ?? defaultPayerId,
      splits: [],
    },
  });

  const watchAmount = form.watch("amount");

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

  const { splits, splitError } = useMemo(() => {
    if (!watchAmount || parseFloat(watchAmount) <= 0) return { splits: null, splitError: null };
    try {
      const total = new Decimal(watchAmount);
      let result;
      if (splitMode === "PERCENTAGE") {
        const includedInputs = splitInputs
          .filter((s) => s.isIncluded)
          .map((s) => ({ userId: s.userId, percentage: s.percentage, isLocked: s.isLocked }));
        if (includedInputs.length === 0) return { splits: null, splitError: "Include at least one person" };
        result = calculatePercentage(total, includedInputs);
      } else {
        const includedInputs = splitInputs
          .filter((s) => s.isIncluded)
          .map((s) => ({ userId: s.userId, amount: s.amount, isLocked: s.isLocked }));
        if (includedInputs.length === 0) return { splits: null, splitError: "Include at least one person" };
        result = calculateLock(total, includedInputs);
      }
      return { splits: result, splitError: null };
    } catch (e) {
      return { splits: null, splitError: e instanceof Error ? e.message : "Split error" };
    }
  }, [watchAmount, splitMode, splitInputs]);

  async function onSubmit(data: CreateExpenseInput) {
    if (!splits) {
      toast.error(splitError ?? "Invalid split configuration");
      return;
    }
    const splitData = splits.map((s) => ({
      userId: s.userId,
      amount: s.amount.toString(),
      isLocked: s.isLocked,
    }));
    const payload = { ...data, currency, splitMode, splits: splitData };
    const result = expenseId
      ? await updateExpense(expenseId, payload)
      : await createExpense(payload);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(expenseId ? "Expense updated!" : "Expense added!");
    onSuccess?.();
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input autoFocus placeholder="Dinner, taxi, hotel..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Amount</FormLabel>
          <AmountInput
            value={watchAmount}
            onChange={(v) => form.setValue("amount", v)}
            currency={currency}
            onCurrencyChange={setCurrency}
          />
        </FormItem>
        <FormField
          control={form.control}
          name="payerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Paid by</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue>
                      {members.find((m) => m.id === field.value)?.name ??
                        members.find((m) => m.id === field.value)?.email ??
                        "Select member"}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name ?? m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-3">
          <Label>Split</Label>
          <SplitModeSelector value={splitMode} onChange={handleModeChange} />

          {/* PERCENTAGE — name | include switch | % input | lock icon */}
          {splitMode === "PERCENTAGE" && (
            <div className="space-y-2">
              {members.map((m, i) => {
                const isIncluded = splitInputs[i].isIncluded;
                const isLocked = splitInputs[i].isLocked;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2 transition-opacity ${!isIncluded ? "opacity-40" : ""}`}
                  >
                    <label
                      htmlFor={`pct-include-${m.id}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium cursor-pointer"
                    >
                      {m.name ?? m.email}
                    </label>
                    <Switch
                      id={`pct-include-${m.id}`}
                      checked={isIncluded}
                      onCheckedChange={(v) =>
                        setSplitInputs((prev) =>
                          prev.map((s, j) => (j === i ? { ...s, isIncluded: v, isLocked: v ? s.isLocked : false } : s))
                        )
                      }
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="0"
                        disabled={!isIncluded}
                        value={splitInputs[i].percentage}
                        onChange={(e) =>
                          setSplitInputs((prev) => {
                            const val = e.target.value;
                            const updated = prev.map((s, j) =>
                              j === i ? { ...s, percentage: val, isLocked: true } : s
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
                          })
                        }
                        className="w-20 text-right"
                      />
                      <span className="text-sm text-muted-foreground shrink-0">%</span>
                    </div>
                    <button
                      type="button"
                      disabled={!isIncluded}
                      onClick={() =>
                        setSplitInputs((prev) =>
                          prev.map((s, j) => (j === i ? { ...s, isLocked: !s.isLocked } : s))
                        )
                      }
                      className="shrink-0 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30 transition-colors"
                      aria-label={isLocked ? "Unlock percentage" : "Lock percentage"}
                    >
                      {isLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* LOCK (Amount) — name | include switch | amount input | lock icon */}
          {splitMode === "LOCK" && (
            <div className="space-y-2">
              {members.map((m, i) => {
                const isIncluded = splitInputs[i].isIncluded;
                const isLocked = splitInputs[i].isLocked;
                const computedAmount = splits?.find((s) => s.userId === m.id)?.amount;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2 transition-opacity ${!isIncluded ? "opacity-40" : ""}`}
                  >
                    <label
                      htmlFor={`include-${m.id}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium cursor-pointer"
                    >
                      {m.name ?? m.email}
                    </label>
                    <Switch
                      id={`include-${m.id}`}
                      checked={isIncluded}
                      onCheckedChange={(v) =>
                        setSplitInputs((prev) =>
                          prev.map((s, j) => (j === i ? { ...s, isIncluded: v, isLocked: v ? s.isLocked : false } : s))
                        )
                      }
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0.00"
                        disabled={!isIncluded}
                        value={isLocked ? splitInputs[i].amount : (computedAmount?.toFixed(2) ?? "")}
                        onChange={(e) =>
                          setSplitInputs((prev) =>
                            prev.map((s, j) =>
                              j === i ? { ...s, amount: e.target.value, isLocked: true } : s
                            )
                          )
                        }
                        className="w-20 text-right"
                      />
                      <span className="text-sm text-muted-foreground shrink-0">{CURRENCY_SYMBOLS[currency] ?? currency}</span>
                    </div>
                    <button
                      type="button"
                      disabled={!isIncluded}
                      onClick={() =>
                        setSplitInputs((prev) =>
                          prev.map((s, j) => (j === i ? { ...s, isLocked: !s.isLocked } : s))
                        )
                      }
                      className="shrink-0 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30 transition-colors"
                      aria-label={isLocked ? "Unlock amount" : "Lock amount"}
                    >
                      {isLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {splits && watchAmount && (
            <SplitPreviewBar splits={splits} />
          )}
          {splitError && (
            <p className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {splitError}
            </p>
          )}
        </div>
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full"
        >
          {form.formState.isSubmitting
            ? expenseId ? "Saving..." : "Adding..."
            : expenseId ? "Save changes" : "Add expense"}
        </Button>
      </form>
    </Form>
  );
}
