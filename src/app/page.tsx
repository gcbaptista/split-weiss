import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { GroupCard } from "@/components/groups/group-card";
import { JoinGroupForm } from "@/components/groups/join-group-form";
import { QrScannerButton } from "@/components/groups/qr-scanner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { getRecentAccessibleGroups } from "@/lib/group-access";

export default async function LandingPage() {
  const [recentGroups, t] = await Promise.all([
    getRecentAccessibleGroups(),
    getTranslations("landing"),
  ]);

  const features = [
    { emoji: "⚖️", title: t("features.splitting.title"), desc: t("features.splitting.desc") },
    { emoji: "💱", title: t("features.currency.title"), desc: t("features.currency.desc") },
    { emoji: "🧮", title: t("features.settlement.title"), desc: t("features.settlement.desc") },
  ];

  return (
    <div className="min-h-screen bg-muted/10">
      <Navbar />
      <main className="container mx-auto max-w-5xl px-4 md:px-6">
        {recentGroups.length > 0 ? (
          <section className="pt-10 pb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{t("recentGroups")}</h2>
                <p className="text-sm text-muted-foreground">{t("recentGroupsSubtitle")}</p>
              </div>
              <Button render={<Link href="/groups/new" />} variant="outline">
                {t("newGroup")}
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <div className="flex-1">
                <JoinGroupForm />
              </div>
              <QrScannerButton />
            </div>
          </section>
        ) : (
          <section className="py-24 text-center space-y-6 max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl leading-tight">
              {t("heroTitle")}
            </h1>
            <p className="text-muted-foreground text-lg">{t("heroSubtitle")}</p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button render={<Link href="/groups/new" />} size="lg">
                {t("createGroup")}
              </Button>
            </div>
            <div className="mx-auto w-full max-w-sm pt-2 space-y-3">
              <p className="text-sm text-muted-foreground">{t("haveGroupLink")}</p>
              <JoinGroupForm />
              <div className="flex justify-center">
                <QrScannerButton />
              </div>
            </div>
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
