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
  calculateEqual,
  calculatePercentage,
  calculateValue,
  calculateLock,
} from "@/lib/splitting";
import Decimal from "decimal.js";
import type { User, ExpenseWithSplitsClient } from "@/types/database";
import type { SplitMode } from "@/hooks/use-split-calculator";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface ExpenseFormProps {
  groupId: string;
  members: User[];
  groupCurrency: string;
  currentUserId: string;
  onSuccess?: () => void;
  expenseId?: string;
  initialExpense?: ExpenseWithSplitsClient;
}

interface SplitInputState {
  userId: string;
  amount: string;
  percentage: string;
  isLocked: boolean;
}

export function ExpenseForm({
  groupId,
  members,
  groupCurrency,
  currentUserId,
  onSuccess,
  expenseId,
  initialExpense,
}: ExpenseFormProps) {
  const router = useRouter();
  const [currency, setCurrency] = useState(initialExpense?.currency ?? groupCurrency);
  const [splitMode, setSplitMode] = useState<SplitMode>(
    (initialExpense?.splitMode as SplitMode) ?? "EQUAL"
  );
  const [splitInputs, setSplitInputs] = useState<SplitInputState[]>(() =>
    members.map((m) => {
      const s = initialExpense?.splits.find((sp) => sp.userId === m.id);
      return {
        userId: m.id,
        amount: s?.amount ?? "",
        percentage: s?.percentage ?? "",
        isLocked: s?.isLocked ?? false,
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
      splitMode: (initialExpense?.splitMode as SplitMode) ?? "EQUAL",
      date: initialExpense
        ? new Date(initialExpense.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      payerId: initialExpense?.payerId ?? currentUserId,
      splits: [],
    },
  });

  const watchAmount = form.watch("amount");

  const { splits, splitError } = useMemo(() => {
    if (!watchAmount || parseFloat(watchAmount) <= 0) return { splits: null, splitError: null };
    try {
      const total = new Decimal(watchAmount);
      const inputs = splitInputs.map((s) => ({
        userId: s.userId,
        amount: s.amount,
        percentage: s.percentage,
        isLocked: s.isLocked,
      }));
      let result;
      if (splitMode === "EQUAL") result = calculateEqual(total, members.map((m) => m.id));
      else if (splitMode === "PERCENTAGE") result = calculatePercentage(total, inputs);
      else if (splitMode === "VALUE") result = calculateValue(total, inputs);
      else result = calculateLock(total, inputs);
      return { splits: result, splitError: null };
    } catch (e) {
      return { splits: null, splitError: e instanceof Error ? e.message : "Split error" };
    }
  }, [watchAmount, splitMode, splitInputs, members]);

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
                <Input placeholder="Dinner, taxi, hotel..." {...field} />
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
          <SplitModeSelector value={splitMode} onChange={setSplitMode} />
          {splitMode !== "EQUAL" && (
            <div className="space-y-2">
              {members.map((m, i) => (
                <div
                  key={m.id}
                  className="space-y-1.5 rounded-md border p-3 sm:flex sm:items-center sm:gap-3 sm:space-y-0"
                >
                  <div className="flex items-center justify-between sm:contents">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium sm:w-24 sm:flex-none">
                      {m.name ?? m.email}
                    </span>
                    {splits && (
                      <span className="text-sm font-medium text-muted-foreground sm:hidden">
                        {formatCurrency(
                          splits.find((s) => s.userId === m.id)?.amount.toString() ?? "0",
                          currency
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:contents">
                    {splitMode === "LOCK" && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Switch
                          checked={splitInputs[i].isLocked}
                          onCheckedChange={(v) =>
                            setSplitInputs((prev) =>
                              prev.map((s, j) => (j === i ? { ...s, isLocked: v } : s))
                            )
                          }
                          id={`lock-${m.id}`}
                        />
                        <label
                          htmlFor={`lock-${m.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          Lock
                        </label>
                      </div>
                    )}
                    {(splitMode === "VALUE" ||
                      (splitMode === "LOCK" && splitInputs[i].isLocked)) && (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={splitInputs[i].amount}
                        onChange={(e) =>
                          setSplitInputs((prev) =>
                            prev.map((s, j) =>
                              j === i ? { ...s, amount: e.target.value } : s
                            )
                          )
                        }
                        className="w-full sm:w-28"
                      />
                    )}
                    {splitMode === "PERCENTAGE" && (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="0"
                        value={splitInputs[i].percentage}
                        onChange={(e) =>
                          setSplitInputs((prev) =>
                            prev.map((s, j) =>
                              j === i ? { ...s, percentage: e.target.value } : s
                            )
                          )
                        }
                        className="w-full sm:w-20"
                      />
                    )}
                  </div>
                  {splits && (
                    <span className="hidden sm:block ml-auto text-sm font-medium text-muted-foreground">
                      {formatCurrency(
                        splits.find((s) => s.userId === m.id)?.amount.toString() ?? "0",
                        currency
                      )}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {splitMode === "EQUAL" && splits && watchAmount && (
            <p className="text-sm text-muted-foreground">
              Each person pays{" "}
              {formatCurrency(splits[0]?.amount.toString() ?? "0", currency)}
            </p>
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
