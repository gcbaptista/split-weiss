"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

interface GroupShareProps {
  groupName: string;
  groupUrl: string;
  hasPassword: boolean;
}

export function GroupShare({ groupName, groupUrl, hasPassword }: GroupShareProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [copied, setCopied] = useState(false);
  const supportsShare = useSyncExternalStore(
    () => () => {},
    () => !!navigator.share,
    () => false
  );

  async function handleCopy() {
    if (!groupUrl) return;
    const text = hasPassword
      ? t("shareTextLocked", { name: groupName, url: groupUrl })
      : t("shareTextOpen", { name: groupName, url: groupUrl });
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!groupUrl) return;
    const text = hasPassword
      ? t("shareNativeLocked", { name: groupName })
      : t("shareNativeOpen", { name: groupName });
    try {
      await navigator.share({ title: groupName, text, url: groupUrl });
    } catch {
      // User cancelled or share not supported — fall back to copy
      await handleCopy();
    }
  }

  return (
    <div className="space-y-4">
      {groupUrl && (
        <div className="flex justify-center rounded-lg border bg-white p-4">
          <QRCodeSVG value={groupUrl} size={180} level="M" />
        </div>
      )}

      {hasPassword && (
        <p className="text-xs text-muted-foreground">🔒 {t("passwordProtectedShare")}</p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={handleCopy} disabled={!groupUrl}>
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              {tc("copied")}
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              {tc("copyLink")}
            </>
          )}
        </Button>
        {supportsShare && (
          <Button className="flex-1" onClick={handleShare} disabled={!groupUrl}>
            <Share2 className="mr-2 h-4 w-4" />
            {tc("share")}
          </Button>
        )}
      </div>
    </div>
  );
}
