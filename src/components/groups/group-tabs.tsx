"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function getActiveTab(pathname: string, groupId: string) {
  if (pathname === `/groups/${groupId}`) return "expenses";
  if (pathname.endsWith("/balances")) return "balances";
  if (pathname.endsWith("/settlements")) return "settlements";
  if (pathname.endsWith("/settings")) return "settings";
  return "expenses";
}

export function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const active = getActiveTab(pathname, groupId);
  const te = useTranslations("expenses");
  const tb = useTranslations("balances");
  const ts = useTranslations("settlements");
  const tst = useTranslations("settings");
  return (
    <Tabs value={active} className="mb-6">
      <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <TabsList variant="line" className="min-w-full border-b rounded-none">
          <TabsTrigger render={<Link href={`/groups/${groupId}`} />} value="expenses">
            {te("tabLabel")}
          </TabsTrigger>
          <TabsTrigger render={<Link href={`/groups/${groupId}/balances`} />} value="balances">
            {tb("tabLabel")}
          </TabsTrigger>
          <TabsTrigger
            render={<Link href={`/groups/${groupId}/settlements`} />}
            value="settlements"
          >
            {ts("tabLabel")}
          </TabsTrigger>
          <TabsTrigger render={<Link href={`/groups/${groupId}/settings`} />} value="settings">
            {tst("tabLabel")}
          </TabsTrigger>
        </TabsList>
      </div>
    </Tabs>
  );
}
