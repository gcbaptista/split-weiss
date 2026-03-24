import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
import {
  cleanupDeviceAccessIfDue,
  generateDeviceToken,
  registerDeviceAccess,
  verifyDeviceAccess,
} from "@/lib/device-token";
import { getDeviceTokenFromCookies, setDeviceTokenCookie } from "@/lib/device-token-server";
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
  | { status: "needs-identity"; group: GroupWithMembers }
  | { status: "authorized"; group: GroupWithMembers; currentMemberId: string };

type GroupAccessStatus = "not-found" | "locked" | "needs-identity" | "authorized";

const getGroupAccessStatus = cache(async (groupId: string): Promise<GroupAccessStatus> => {
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { id: true, passwordHash: true },
  });

  if (!group) return "not-found";

  const deviceToken = await getDeviceTokenFromCookies();

  // If password-protected, verify device has access
  if (group.passwordHash) {
    if (!deviceToken) return "locked";
    if (!(await verifyDeviceAccess(groupId, deviceToken))) return "locked";
  }

  // Check if device has identified as a member
  if (deviceToken) {
    const access = await db.deviceAccess.findUnique({
      where: { groupId_deviceToken: { groupId, deviceToken } },
      select: { memberId: true },
    });
    if (access?.memberId) return "authorized";
  }

  return "needs-identity";
});

export const canAccessGroup = cache(async (groupId: string): Promise<boolean> => {
  const status = await getGroupAccessStatus(groupId);
  return status === "authorized" || status === "needs-identity";
});

/** Get the current member ID for this device+group, or null */
export const getCurrentMemberId = cache(async (groupId: string): Promise<string | null> => {
  const deviceToken = await getDeviceTokenFromCookies();
  if (!deviceToken) return null;
  const access = await db.deviceAccess.findUnique({
    where: { groupId_deviceToken: { groupId, deviceToken } },
    select: { memberId: true },
  });
  return access?.memberId ?? null;
});

export const getGroupRequestAccess = cache(async (groupId: string): Promise<GroupRequestAccess> => {
  const status = await getGroupAccessStatus(groupId);

  if (status === "not-found") return { status };
  if (status === "locked") return { status };

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
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!group) return { status: "not-found" };

  if (status === "needs-identity") {
    return { status: "needs-identity", group };
  }

  const currentMemberId = await getCurrentMemberId(groupId);
  return { status: "authorized", group, currentMemberId: currentMemberId! };
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

  const groupMap = new Map(groups.map((group) => [group.id, group]));

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
  await cleanupDeviceAccessIfDue(groupId);
  await setDeviceTokenCookie(deviceToken);
  await rememberRecentGroup(groupId);

  return "ok";
}
