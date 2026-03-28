"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ExpenseWithSplitsClient } from "@/types/database";

import { ExpenseForm } from "./expense-form";

interface AddExpenseDialogProps {
  // Edit mode — when provided, renders no trigger button and is controlled externally
  expense?: ExpenseWithSplitsClient;
  // Duplicate mode — pre-fills the form but creates a new expense
  templateExpense?: ExpenseWithSplitsClient;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddExpenseDialog({
  expense,
  templateExpense,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddExpenseDialogProps) {
  const t = useTranslations("expenses");
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setUncontrolledOpen;

  const isEdit = !!expense;
  const isDuplicate = !isEdit && !!templateExpense;
  const title = isEdit ? t("editExpense") : isDuplicate ? t("duplicateExpense") : t("addExpense");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger render={<Button />}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addExpense")}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[95svh] overflow-y-auto p-4 sm:p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ExpenseForm
          onSuccess={() => setOpen(false)}
          expenseId={isEdit ? expense?.id : undefined}
          initialExpense={expense ?? templateExpense}
        />
      </DialogContent>
    </Dialog>
  );
}
