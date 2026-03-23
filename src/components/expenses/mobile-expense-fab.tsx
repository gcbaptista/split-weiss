"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import type { MemberSummary } from "@/types/database";

import { AddExpenseDialog } from "./add-expense-dialog";

interface MobileExpenseFABProps {
  groupId: string;
  members: MemberSummary[];
  groupCurrency: string;
  defaultPayerId: string;
}

export function MobileExpenseFAB({
  groupId,
  members,
  groupCurrency,
  defaultPayerId,
}: MobileExpenseFABProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Add expense"
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>
      <AddExpenseDialog
        groupId={groupId}
        members={members}
        groupCurrency={groupCurrency}
        defaultPayerId={defaultPayerId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
