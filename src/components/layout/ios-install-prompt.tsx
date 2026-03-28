"use client";

import { EllipsisVertical, Share, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "splitweiss-install-dismissed";
const VISIT_COUNT_KEY = "splitweiss-visit-count";
const MIN_VISITS = 2;

type Platform = "ios-safari" | "ios-chrome" | "android" | null;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;

  // Already installed as PWA — don't show
  const isStandalone =
    ("standalone" in navigator && (navigator as Record<string, unknown>).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches;
  if (isStandalone) return null;

  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIos) return /CriOS/.test(ua) ? "ios-chrome" : "ios-safari";

  // Android Chrome
  if (/Android/.test(ua) && /Chrome/.test(ua) && !/Edge|OPR|Samsung/.test(ua)) return "android";

  return null;
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
      {n}
    </span>
  );
}

function IosSafariSteps() {
  return (
    <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
      <li className="flex items-center gap-2">
        <StepNumber n={1} />
        <span>
          Tap <EllipsisVertical className="inline h-3.5 w-3.5 -mt-0.5 text-primary" /> in the
          toolbar, then <Share className="inline h-3.5 w-3.5 -mt-0.5 text-primary" />{" "}
          <strong className="text-foreground">Share</strong>
        </span>
      </li>
      <li className="flex items-center gap-2">
        <StepNumber n={2} />
        <span>
          Tap <strong className="text-foreground">View More</strong>, then{" "}
          <strong className="text-foreground">+ Add to Home Screen</strong>
        </span>
      </li>
      <li className="flex items-center gap-2">
        <StepNumber n={3} />
        <span>
          Tap <strong className="text-foreground">Add</strong> — done! 🍺
        </span>
      </li>
    </ol>
  );
}

function IosChromeSteps() {
  return (
    <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
      <li className="flex items-center gap-2">
        <StepNumber n={1} />
        <span>
          Tap the <Share className="inline h-3.5 w-3.5 -mt-0.5 text-primary" /> Share button in
          Chrome
        </span>
      </li>
      <li className="flex items-center gap-2">
        <StepNumber n={2} />
        <span>
          Tap <strong className="text-foreground">Add to Home Screen</strong>
        </span>
      </li>
      <li className="flex items-center gap-2">
        <StepNumber n={3} />
        <span>
          Tap <strong className="text-foreground">Add</strong> — done! 🍺
        </span>
      </li>
    </ol>
  );
}

function AndroidSteps() {
  return (
    <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
      <li className="flex items-center gap-2">
        <StepNumber n={1} />
        <span>
          Tap the <EllipsisVertical className="inline h-3.5 w-3.5 -mt-0.5 text-primary" /> menu in
          Chrome
        </span>
      </li>
      <li className="flex items-center gap-2">
        <StepNumber n={2} />
        <span>
          Tap <strong className="text-foreground">Add to Home screen</strong> or{" "}
          <strong className="text-foreground">Install app</strong>
        </span>
      </li>
      <li className="flex items-center gap-2">
        <StepNumber n={3} />
        <span>
          Tap <strong className="text-foreground">Install</strong> — done! 🍺
        </span>
      </li>
    </ol>
  );
}

export function IosInstallPrompt() {
  const t = useTranslations("install");
  const installState = useSyncExternalStore(
    () => () => {},
    () => {
      const detected = detectPlatform();
      if (!detected) return null;

      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed) return null;

      const count = parseInt(localStorage.getItem(VISIT_COUNT_KEY) ?? "0", 10) + 1;
      localStorage.setItem(VISIT_COUNT_KEY, count.toString());

      if (count >= MIN_VISITS) return detected;
      return null;
    },
    () => null
  );
  const [visible, setVisible] = useState(true);
  const platform = installState;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  if (!visible || !platform) return null;

  return (
    <div className="relative mx-4 mb-4 rounded-xl border bg-card p-4 shadow-sm animate-in slide-in-from-top-2 fade-in duration-300">
      <button
        onClick={dismiss}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-6">
        <p className="text-sm font-semibold">{t("title")}</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{t("subtitle")}</p>
        {platform === "ios-safari" && <IosSafariSteps />}
        {platform === "ios-chrome" && <IosChromeSteps />}
        {platform === "android" && <AndroidSteps />}
      </div>
    </div>
  );
}
