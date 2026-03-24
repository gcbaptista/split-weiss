"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { resetIdentity } from "@/app/actions/group.actions";
import { Button } from "@/components/ui/button";

interface ResetIdentityButtonProps {
  groupId: string;
  currentMemberName?: string;
}

export function ResetIdentityButton({ groupId, currentMemberName }: ResetIdentityButtonProps) {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    const result = await resetIdentity(groupId);
    if (result.error) {
      toast.error(result.error);
      setResetting(false);
    } else {
      toast.success("Identity reset — pick who you are.");
      router.refresh();
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">
        {currentMemberName ? (
          <>Identified as <strong className="text-foreground">{currentMemberName}</strong></>
        ) : (
          "Not identified on this device."
        )}
      </p>
      <Button variant="outline" size="sm" className="shrink-0" onClick={handleReset} disabled={resetting}>
        {resetting ? "Resetting..." : "Switch"}
      </Button>
    </div>
  );
}
