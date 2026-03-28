"use client";

import { createContext, useContext } from "react";

import type { MemberSummary } from "@/types/database";

interface GroupContextValue {
  groupId: string;
  groupCurrency: string;
  members: MemberSummary[];
  currentMemberId: string;
  defaultPayerId: string;
}

const GroupContext = createContext<GroupContextValue | null>(null);

export function useGroupContext(): GroupContextValue {
  const ctx = useContext(GroupContext);
  if (!ctx) {
    throw new Error("useGroupContext must be used within a GroupProvider");
  }
  return ctx;
}

interface GroupProviderProps extends GroupContextValue {
  children: React.ReactNode;
}

export function GroupProvider({ children, ...value }: GroupProviderProps) {
  return <GroupContext value={value}>{children}</GroupContext>;
}
