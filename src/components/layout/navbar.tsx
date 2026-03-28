import Link from "next/link";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto max-w-5xl px-4 md:px-6 h-16 flex items-center">
        <LocaleSwitcher />
        <Link href="/" className="flex-1 flex flex-col justify-center items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍺</span>
            <span
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              SplitWeiss
            </span>
          </div>
          <p className="text-xs text-muted-foreground tracking-wide">
            Don&apos;t split wise. Split Weiss.
          </p>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
