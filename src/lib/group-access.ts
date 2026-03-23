import "server-only";

import { cache } from "react";
import { db } from "@/lib/db";
import {
  getDeviceTokenFromCookies,
  setDeviceTokenCookie,
} from "@/lib/device-token-server";
import {
  generateDeviceToken,
  registerDeviceAccess,
  verifyDeviceAccess,
} from "@/lib/device-token";
import { verifyPassword } from "@/lib/password";
import { getRecentGroupIds, rememberRecentGroup } from "@/lib/recent-groups";
import type { GroupWithMembers } from "@/types/database";

const memberSelect = {
  id: true,
  name: true,
} as const;

export type GroupRequestAccess =
  | { status: "not-found" }
  | { status: "locked" }
  | { status: "authorized"; group: GroupWithMembers };

type GroupAccessStatus = GroupRequestAccess["status"];

const getGroupAccessStatus = cache(
  async (groupId: string): Promise<GroupAccessStatus> => {
    const group = await db.group.findUnique({
      where: { id: groupId },
      select: { id: true, passwordHash: true },
    });

    if (!group) return "not-found";
    if (!group.passwordHash) return "authorized";

    const deviceToken = await getDeviceTokenFromCookies();
    if (!deviceToken) return "locked";

    return (await verifyDeviceAccess(groupId, deviceToken))
      ? "authorized"
      : "locked";
  }
);

export const canAccessGroup = cache(async (groupId: string): Promise<boolean> => {
  return (await getGroupAccessStatus(groupId)) === "authorized";
});

export const getGroupRequestAccess = cache(async (
  groupId: string
): Promise<GroupRequestAccess> => {
  const status = await getGroupAccessStatus(groupId);

  if (status !== "authorized") {
    return { status };
  }

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      emoji: true,
      currency: true,
      passwordHash: true,
      members: {
        select: memberSelect,
      },
    },
  });

  if (!group) {
    return { status: "not-found" };
  }

  return { status: "authorized", group };
});

export const getAuthorizedGroup = cache(async (groupId: string) => {
  const access = await getGroupRequestAccess(groupId);
  return access.status === "authorized" ? access.group : null;
});

export async function getRecentAccessibleGroups() {
  const recentGroupIds = await getRecentGroupIds();
  if (recentGroupIds.length === 0) return [];

  const deviceToken = await getDeviceTokenFromCookies();
  const groups = await db.group.findMany({
    where: {
      id: { in: recentGroupIds },
      OR: deviceToken
        ? [{ passwordHash: null }, { deviceAccess: { some: { deviceToken } } }]
        : [{ passwordHash: null }],
    },
    select: {
      id: true,
      name: true,
      emoji: true,
      currency: true,
      _count: { select: { members: true, expenses: true } },
    },
  });

  const groupMap = new Map(
    groups.map((group) => [group.id, group])
  );

  return recentGroupIds
    .map((groupId) => groupMap.get(groupId))
    .filter((group): group is NonNullable<typeof group> => group !== undefined);
}

export async function unlockGroupAccess(
  groupId: string,
  password: string
): Promise<"ok" | "not-found" | "no-password" | "wrong-password"> {
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { passwordHash: true },
  });

  if (!group) return "not-found";
  if (!group.passwordHash) return "no-password";

  const isValid = await verifyPassword(password, group.passwordHash);
  if (!isValid) return "wrong-password";

  const deviceToken = (await getDeviceTokenFromCookies()) ?? generateDeviceToken();

  await registerDeviceAccess(groupId, deviceToken);
  await setDeviceTokenCookie(deviceToken);
  await rememberRecentGroup(groupId);

  return "ok";
}
