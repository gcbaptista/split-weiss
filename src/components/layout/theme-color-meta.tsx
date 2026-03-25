"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", resolvedTheme === "dark" ? "#1a1a1a" : "#ffffff");
    }
  }, [resolvedTheme, mounted]);

  return null;
}

