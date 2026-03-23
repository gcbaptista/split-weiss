"use client";
import { ArrowLeftRight, Receipt, Scale, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { value: "expenses", label: "Expenses", icon: Receipt, href: (id: string) => `/groups/${id}` },
  {
    value: "balances",
    label: "Balances",
    icon: Scale,
    href: (id: string) => `/groups/${id}/balances`,
  },
  {
    value: "settlements",
    label: "Settle",
    icon: ArrowLeftRight,
    href: (id: string) => `/groups/${id}/settlements`,
  },
  {
    value: "settings",
    label: "Settings",
    icon: Settings,
    href: (id: string) => `/groups/${id}/settings`,
  },
];

function getActiveTab(pathname: string, groupId: string) {
  if (pathname === `/groups/${groupId}`) return "expenses";
  if (pathname.endsWith("/balances")) return "balances";
  if (pathname.endsWith("/settlements")) return "settlements";
  if (pathname.endsWith("/settings")) return "settings";
  return "expenses";
}

export function MobileTabBar({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const active = getActiveTab(pathname, groupId);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden">
      <div className="flex h-16">
        {tabs.map(({ value, label, icon: Icon, href }) => {
          const isActive = active === value;
          return (
            <Link
              key={value}
              href={href(groupId)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
