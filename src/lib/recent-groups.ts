import "server-only";

import { cookies } from "next/headers";

const RECENT_GROUPS_COOKIE = "split-weiss-recent-groups";
const MAX_RECENT_GROUPS = 12;

export async function getRecentGroupIds(): Promise<string[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(RECENT_GROUPS_COOKIE)?.value;

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export async function rememberRecentGroup(groupId: string): Promise<void> {
  const cookieStore = await cookies();
  const current = await getRecentGroupIds();
  const next = [groupId, ...current.filter((id) => id !== groupId)].slice(0, MAX_RECENT_GROUPS);

  cookieStore.set(RECENT_GROUPS_COOKIE, JSON.stringify(next), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
