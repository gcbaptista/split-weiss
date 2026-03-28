"use client";

import { Camera, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Extracts a group path from a scanned URL.
 * Accepts full URLs like https://…/groups/clxyz or bare /groups/clxyz paths.
 */
function extractGroupPath(text: string): string | null {
  const trimmed = text.trim();

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/groups\/([^/]+)/);
    if (match?.[1]) return `/groups/${match[1]}`;
  } catch {
    // not a URL
  }

  const pathMatch = trimmed.match(/\/groups\/([^/]+)/);
  if (pathMatch?.[1]) return `/groups/${pathMatch[1]}`;

  return null;
}

export function QrScannerButton() {
  const t = useTranslations("qrScanner");
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const hasNavigated = useRef(false);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch {
        // already stopped
      }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setError("");
    setScanning(true);
    hasNavigated.current = false;

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scannerId = "qr-reader";

      // Wait for DOM element to be ready
      await new Promise((r) => setTimeout(r, 100));

      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (hasNavigated.current) return;
          const path = extractGroupPath(decodedText);
          if (path) {
            hasNavigated.current = true;
            toast.success(t("groupFound"));
            stopScanner();
            router.push(path);
          }
        },
        () => {
          // QR code not found in frame — ignore
        }
      );
    } catch {
      setError(t("cameraError"));
      setScanning(false);
    }
  }, [router, stopScanner, t]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        html5QrCodeRef.current = null;
      }
    };
  }, []);

  if (!scanning) {
    return (
      <Button variant="outline" size="sm" onClick={startScanner} className="gap-2">
        <Camera className="h-4 w-4" />
        {t("scanQR")}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">{t("scanTitle")}</h2>
        <Button variant="ghost" size="sm" onClick={stopScanner}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <div
          ref={scannerRef}
          id="qr-reader"
          className="w-full max-w-sm overflow-hidden rounded-lg"
        />
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <p className="mt-4 text-sm text-muted-foreground">{t("scanHint")}</p>
      </div>
    </div>
  );
}
