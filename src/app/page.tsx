import Link from "next/link";
import { getRecentAccessibleGroups } from "@/lib/group-access";
import { GroupCard } from "@/components/groups/group-card";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const recentGroups = await getRecentAccessibleGroups();

  return (
    <main className="min-h-screen bg-linear-to-b from-background to-muted/30 p-6 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="text-center">
          <div className="mb-6 text-5xl sm:text-7xl">💸</div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-5xl">split-weiss</h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-xl">
            Split your Weiss expenses with your friends. Multi-currency. Free forever.
          </p>
        </section>

        {recentGroups.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold sm:text-2xl">Recent groups</h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Pick up where you left off.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border bg-card/70 p-6 text-center sm:p-8">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-3 text-2xl font-semibold">
              {recentGroups.length > 0 ? "Open another group" : "No recent groups yet"}
            </h2>
            <p className="mb-6 text-sm text-muted-foreground sm:text-base">
              Open a group link and it will show up here next time. If a group uses a
              password, you only need it once per device.
            </p>
            <Button
              render={<Link href="/groups/new" />}
              size="lg"
              variant={recentGroups.length > 0 ? "outline" : "default"}
            >
                Create group
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
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
        </section>
      </div>
    </main>
  );
}
