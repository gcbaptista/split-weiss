"use client";

import { useTheme } from "next-themes";
import { useEffect, useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!mounted) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", resolvedTheme === "dark" ? "#1a1a1a" : "#ffffff");
    }
  }, [resolvedTheme, mounted]);

  return null;
}
