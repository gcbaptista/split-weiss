"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createExpense, updateExpense } from "@/app/actions/expense.actions";
import { AmountInput } from "@/components/shared/amount-input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGroupContext } from "@/contexts/group-context";
import { useSplitInputs } from "@/hooks/use-split-inputs";
import { type CreateExpenseInput, createExpenseSchema } from "@/lib/validations/expense.schema";
import type { ExpenseWithSplitsClient, SplitMode } from "@/types/database";

import { SplitEditor } from "./split-editor";

interface ExpenseFormProps {
  onSuccess?: () => void;
  expenseId?: string;
  initialExpense?: ExpenseWithSplitsClient;
}

function getLastCurrency(memberId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`splitweiss_last_currency_${memberId}`);
}

function setLastCurrency(memberId: string, currency: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`splitweiss_last_currency_${memberId}`, currency);
}

export function ExpenseForm({ onSuccess, expenseId, initialExpense }: ExpenseFormProps) {
  const { groupId, members, groupCurrency, defaultPayerId } = useGroupContext();
  const t = useTranslations("expenses");
  const router = useRouter();
  const [currency, setCurrency] = useState(() => {
    if (initialExpense?.currency) return initialExpense.currency;
    const last = getLastCurrency(defaultPayerId);
    if (last) return last;
    return groupCurrency;
  });
  const { splitMode, splitInputs, setSplitInputs, handleModeChange, computeSplits } =
    useSplitInputs({
      members,
      initialExpense,
      errorMessage: t("includeAtLeastOne"),
      genericErrorMessage: t("splitError"),
    });

  const form = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      groupId,
      title: initialExpense?.title ?? "",
      amount: initialExpense?.amount ?? "",
      currency,
      splitMode: (initialExpense?.splitMode as SplitMode) ?? "LOCK",
      payerId: initialExpense?.payerId ?? defaultPayerId,
      date: initialExpense?.date
        ? new Date(initialExpense.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      splits: [],
    },
  });

  const watchAmount = form.watch("amount");

  const { splits, splitError } = useMemo(
    () => computeSplits(watchAmount),
    [watchAmount, splitMode, splitInputs, computeSplits]
  );

  async function onSubmit(data: CreateExpenseInput) {
    if (!splits) {
      toast.error(splitError ?? t("invalidSplit"));
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
    setLastCurrency(data.payerId, currency);
    toast.success(expenseId ? t("expenseUpdated") : t("expenseAdded"));
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
              <FormLabel>{t("description")}</FormLabel>
              <FormControl>
                <Input placeholder={t("descriptionPlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>{t("amount")}</FormLabel>
          <AmountInput
            value={watchAmount}
            onChange={(v) => form.setValue("amount", v)}
            currency={currency}
            onCurrencyChange={setCurrency}
          />
          {currency !== groupCurrency && (
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              ⚠️ {t("foreignCurrencyWarning")}
            </p>
          )}
        </FormItem>
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("date")}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="payerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("paidBy")}</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  if (!initialExpense && value) {
                    const last = getLastCurrency(value);
                    if (last) setCurrency(last);
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue>
                      {members.find((m) => m.id === field.value)?.name ?? t("selectMember")}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <SplitEditor
          members={members}
          splitMode={splitMode}
          onModeChange={handleModeChange}
          splitInputs={splitInputs}
          setSplitInputs={setSplitInputs}
          splits={splits}
          splitError={splitError}
          currency={currency}
          hasAmount={!!watchAmount}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting
            ? expenseId
              ? t("savingExpense")
              : t("addingExpense")
            : expenseId
              ? t("saveChanges")
              : t("addExpense")}
        </Button>
      </form>
    </Form>
  );
}
