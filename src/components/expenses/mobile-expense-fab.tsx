"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AddExpenseDialog } from "./add-expense-dialog";

export function MobileExpenseFAB() {
  const t = useTranslations("expenses");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("addExpense")}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>
      <AddExpenseDialog
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
