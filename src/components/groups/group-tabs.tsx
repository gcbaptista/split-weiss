"use client";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

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
  return (
    <Tabs value={active} className="mb-6">
      <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <TabsList variant="line" className="min-w-full border-b rounded-none">
          <TabsTrigger render={<Link href={`/groups/${groupId}`} />} value="expenses">Expenses</TabsTrigger>
          <TabsTrigger render={<Link href={`/groups/${groupId}/balances`} />} value="balances">Balances</TabsTrigger>
          <TabsTrigger render={<Link href={`/groups/${groupId}/settlements`} />} value="settlements">Settlements</TabsTrigger>
          <TabsTrigger render={<Link href={`/groups/${groupId}/settings`} />} value="settings">Settings</TabsTrigger>
        </TabsList>
      </div>
    </Tabs>
  );
}
