import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-background to-muted/30 p-6 sm:p-8 text-center">
      <div className="max-w-2xl">
        <div className="mb-6 text-5xl sm:text-7xl">💸</div>
        <h1 className="mb-4 text-3xl sm:text-5xl font-bold tracking-tight">split-weiss</h1>
        <p className="mb-8 text-base sm:text-xl text-muted-foreground">
          Split your Weiss expenses with your friends. Multi-currency. Free forever.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button render={<Link href="/sign-up" />} size="lg">
            Get started free
          </Button>
          <Button render={<Link href="/sign-in" />} variant="outline" size="lg">
            Sign in
          </Button>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            {
              emoji: "⚖️",
              title: "4 split modes",
              desc: "Equal, percentage, fixed value, or lock some and split the rest",
            },
            {
              emoji: "💱",
              title: "Multi-currency",
              desc: "Live exchange rates via Frankfurter API, cached automatically",
            },
            {
              emoji: "🧮",
              title: "Smart settlement",
              desc: "Greedy algorithm minimizes the number of payments needed",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-4">
              <div className="mb-2 text-2xl">{f.emoji}</div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
