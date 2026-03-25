"use client";
import Decimal from "decimal.js";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createSettlement } from "@/app/actions/settlement.actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

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
  const t = useTranslations("settlements");
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
    toast.success(t("settlementRecorded"));
    setNote("");
    onOpenChange(false);
    router.refresh();
  }

  if (!debt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("recordSettlement")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <strong>{debt.fromName}</strong>{" → "}<strong>{debt.toName}</strong>{" "}
            {formatCurrency(debt.amount.toString(), currency)}
          </p>
          <div className="space-y-1">
            <Label>{t("noteOptional")}</Label>
            <Input
              placeholder={t("notePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button onClick={handleSettle} disabled={submitting} className="w-full">
            {submitting ? t("recording") : t("markAsSettled")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
