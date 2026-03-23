"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface GroupShareProps {
  groupId: string;
  groupName: string;
  groupUrl: string;
  hasPassword: boolean;
}

export function GroupShare({ groupId, groupName, groupUrl, hasPassword }: GroupShareProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!groupUrl) return;
    const text = hasPassword
      ? `Join "${groupName}" on SplitWeiss:\n${groupUrl}\n\n🔒 This group is password-protected — ask the group creator for the password.`
      : `Join "${groupName}" on SplitWeiss:\n${groupUrl}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!groupUrl) return;
    const text = hasPassword
      ? `Join "${groupName}" on SplitWeiss!\n\n🔒 This group is password-protected — ask the group creator for the password.`
      : `Join "${groupName}" on SplitWeiss!`;
    try {
      await navigator.share({ title: groupName, text, url: groupUrl });
    } catch {
      // User cancelled or share not supported — fall back to copy
      await handleCopy();
    }
  }

  const supportsShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="space-y-4">
      {groupUrl && (
        <div className="flex justify-center rounded-lg border bg-white p-4">
          <QRCodeSVG value={groupUrl} size={180} level="M" />
        </div>
      )}

      {hasPassword && (
        <p className="text-xs text-muted-foreground">
          🔒 This group is password-protected. Share the password separately.
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={handleCopy} disabled={!groupUrl}>
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy link
            </>
          )}
        </Button>
        {supportsShare && (
          <Button className="flex-1" onClick={handleShare} disabled={!groupUrl}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        )}
      </div>
    </div>
  );
}

