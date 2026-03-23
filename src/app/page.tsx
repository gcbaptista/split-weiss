import Link from "next/link";

import { GroupCard } from "@/components/groups/group-card";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { getRecentAccessibleGroups } from "@/lib/group-access";

const features = [
  {
    emoji: "⚖️",
    title: "Flexible splitting",
    desc: "Split by fixed amount or percentage — per person, your way.",
  },
  {
    emoji: "💱",
    title: "Multi-currency",
    desc: "Add expenses in any currency, settled in the group's base currency.",
  },
  {
    emoji: "🧮",
    title: "Smart settlement",
    desc: "Minimizes the number of payments needed to clear all debts.",
  },
];

export default async function LandingPage() {
  const recentGroups = await getRecentAccessibleGroups();

  return (
    <div className="min-h-screen bg-muted/10">
      <Navbar />
      <main className="container mx-auto max-w-5xl px-4 md:px-6">
        {recentGroups.length > 0 ? (
          <section className="pt-10 pb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Recent groups</h2>
                <p className="text-sm text-muted-foreground">Pick up where you left off.</p>
              </div>
              <Button render={<Link href="/groups/new" />} variant="outline">
                New group
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          </section>
        ) : (
          <section className="py-24 text-center space-y-6 max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl leading-tight">
              Never wonder who owes whom again.
            </h1>
            <p className="text-muted-foreground text-lg">
              Split expenses with friends. Multi-currency. Free forever.
            </p>
            <Button render={<Link href="/groups/new" />} size="lg">
              Create a group
            </Button>
          </section>
        )}

        <section className="py-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6 space-y-3">
                <div className="text-4xl">{f.emoji}</div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
