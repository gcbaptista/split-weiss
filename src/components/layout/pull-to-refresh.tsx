"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD = 80;

export function PullToRefresh() {
  const router = useRouter();
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);

  const canPull = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (!canPull() || !e.touches[0]) return;
      startY.current = e.touches[0].clientY;
      currentY.current = startY.current;
      setPulling(true);
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling || !e.touches[0]) return;
      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);

      // Only activate if scrolled to top
      if (window.scrollY > 0) {
        setPulling(false);
        setPullDistance(0);
        return;
      }

      // Apply resistance — diminishing returns past threshold
      const dampened = distance > THRESHOLD
        ? THRESHOLD + (distance - THRESHOLD) * 0.3
        : distance;

      setPullDistance(dampened);
    }

    function onTouchEnd() {
      if (!pulling) return;
      setPulling(false);

      if (pullDistance >= THRESHOLD) {
        setRefreshing(true);
        setPullDistance(THRESHOLD);
        router.refresh();
        // Give the server a moment to respond, then reset
        setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
        }, 1000);
      } else {
        setPullDistance(0);
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [pulling, pullDistance, canPull, router]);

  if (pullDistance === 0 && !refreshing) return null;

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const pastThreshold = pullDistance >= THRESHOLD;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-50 flex justify-center pointer-events-none"
      style={{ transform: `translateY(${pullDistance - 40}px)` }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-md border">
        <RefreshCw
          className={`h-5 w-5 text-muted-foreground transition-transform ${refreshing ? "animate-spin" : ""}`}
          style={{
            transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
            opacity: progress,
            color: pastThreshold ? "var(--color-primary)" : undefined,
          }}
        />
      </div>
    </div>
  );
}

