import "server-only";

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

const userSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type GroupRequestAccess =
  | { status: "not-found" }
  | { status: "locked" }
  | { status: "authorized"; group: GroupWithMembers };

export async function canAccessGroup(groupId: string): Promise<boolean> {
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { passwordHash: true },
  });

  if (!group) return false;
  if (!group.passwordHash) return true;

  const deviceToken = await getDeviceTokenFromCookies();
  if (!deviceToken) return false;

  return verifyDeviceAccess(groupId, deviceToken);
}

export async function getGroupRequestAccess(
  groupId: string
): Promise<GroupRequestAccess> {
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { id: true, passwordHash: true },
  });

  if (!group) {
    return { status: "not-found" };
  }

  if (group.passwordHash) {
    const deviceToken = await getDeviceTokenFromCookies();
    if (!deviceToken) {
      return { status: "locked" };
    }

    const hasAccess = await verifyDeviceAccess(groupId, deviceToken);
    if (!hasAccess) {
      return { status: "locked" };
    }
  }

  const authorizedGroup = await db.group.findUnique({
    where: { id: groupId },
    include: { members: { include: { user: { select: userSelect } } } },
  });

  if (!authorizedGroup) {
    return { status: "not-found" };
  }

  return { status: "authorized", group: authorizedGroup };
}

export async function getAuthorizedGroup(groupId: string) {
  const access = await getGroupRequestAccess(groupId);
  return access.status === "authorized" ? access.group : null;
}

export async function getRecentAccessibleGroups() {
  const recentGroupIds = await getRecentGroupIds();
  if (recentGroupIds.length === 0) return [];

  const deviceToken = await getDeviceTokenFromCookies();
  const groups = await db.group.findMany({
    where: { id: { in: recentGroupIds } },
    include: {
      members: { include: { user: { select: userSelect } } },
      _count: { select: { expenses: true } },
    },
  });

  const accessibleGroups = await Promise.all(
    groups.map(async (group) => {
      if (!group.passwordHash) return group;
      if (!deviceToken) return null;

      const hasAccess = await verifyDeviceAccess(group.id, deviceToken);
      return hasAccess ? group : null;
    })
  );

  const groupMap = new Map(
    accessibleGroups
      .filter((group): group is NonNullable<typeof group> => group !== null)
      .map((group) => [group.id, group])
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

