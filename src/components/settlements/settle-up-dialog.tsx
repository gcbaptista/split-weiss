"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSettlement } from "@/app/actions/settlement.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import Decimal from "decimal.js";

interface DebtForDialog {
  fromUserId: string;
  toUserId: string;
  amount: Decimal;
  fromName: string;
  toName: string;
}

interface SettleUpDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  debt: DebtForDialog | null;
  groupId: string;
  currency: string;
}

export function SettleUpDialog({
  open,
  onOpenChange,
  debt,
  groupId,
  currency,
}: SettleUpDialogProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSettle() {
    if (!debt) return;
    setSubmitting(true);
    const result = await createSettlement({
      groupId,
      fromUserId: debt.fromUserId,
      toUserId: debt.toUserId,
      amount: debt.amount.toString(),
      currency,
      date: new Date().toISOString().split("T")[0],
      note: note || undefined,
    });
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Settlement recorded!");
    setNote("");
    onOpenChange(false);
    router.refresh();
  }

  if (!debt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record settlement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <strong>{debt.fromName}</strong> pays{" "}
            <strong>{debt.toName}</strong>{" "}
            {formatCurrency(debt.amount.toString(), currency)}
          </p>
          <div className="space-y-1">
            <Label>Note (optional)</Label>
            <Input
              placeholder="Bank transfer, cash, MB WAY..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSettle}
            disabled={submitting}
            className="w-full"
          >
            {submitting ? "Recording..." : "Mark as settled"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
