"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { ExpenseForm } from "./expense-form";
import type { User, ExpenseWithSplitsClient } from "@/types/database";

interface AddExpenseDialogProps {
  groupId: string;
  members: User[];
  groupCurrency: string;
  currentUserId: string;
  // Edit mode — when provided, renders no trigger button and is controlled externally
  expense?: ExpenseWithSplitsClient;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddExpenseDialog({
  groupId,
  members,
  groupCurrency,
  currentUserId,
  expense,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddExpenseDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setUncontrolledOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger render={<Button />}>
          <Plus className="mr-2 h-4 w-4" />
          Add expense
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[95svh] overflow-y-auto p-4 sm:p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit expense" : "Add expense"}</DialogTitle>
        </DialogHeader>
        <ExpenseForm
          groupId={groupId}
          members={members}
          groupCurrency={groupCurrency}
          currentUserId={currentUserId}
          onSuccess={() => setOpen(false)}
          expenseId={expense?.id}
          initialExpense={expense}
        />
      </DialogContent>
    </Dialog>
  );
}
