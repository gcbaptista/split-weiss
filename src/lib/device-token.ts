import { randomBytes } from "crypto";

import { db } from "@/lib/db";

const ACCESS_TOUCH_INTERVAL_MS = 60 * 60 * 1000;
const DEVICE_ACCESS_CLEANUP_COOLDOWN_MS = 6 * 60 * 60 * 1000;

/** Unclaimed rows are often abandoned onboarding attempts. */
const UNCLAIMED_STALE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/** Even claimed rows should not live forever if a device disappears. */
const STALE_THRESHOLD_MS = 180 * 24 * 60 * 60 * 1000; // 180 days

/** Keep at most this many recent devices per identified member. */
const MAX_DEVICES_PER_MEMBER = 3;

/** Allow some recent unclaimed devices for invites / first-time opens. */
const MAX_UNCLAIMED_DEVICES = 10;

/** Small groups still get a reasonable floor. */
const MIN_DEVICES_PER_GROUP = 30;

/** Extra headroom beyond per-member allowance. */
const GROUP_DEVICE_BUFFER = 20;

export function generateDeviceToken(): string {
  return randomBytes(32).toString("hex");
}

export async function registerDeviceAccess(groupId: string, deviceToken: string): Promise<void> {
  await db.deviceAccess.upsert({
    where: {
      groupId_deviceToken: {
        groupId,
        deviceToken,
      },
    },
    create: {
      groupId,
      deviceToken,
    },
    update: {
      lastUsedAt: new Date(),
    },
  });
}

export async function verifyDeviceAccess(groupId: string, deviceToken: string): Promise<boolean> {
  const access = await db.deviceAccess.findUnique({
    where: {
      groupId_deviceToken: {
        groupId,
        deviceToken,
      },
    },
    select: {
      id: true,
      lastUsedAt: true,
    },
  });

  if (access) {
    if (Date.now() - access.lastUsedAt.getTime() >= ACCESS_TOUCH_INTERVAL_MS) {
      await db.deviceAccess.update({
        where: { id: access.id },
        data: { lastUsedAt: new Date() },
      });
    }

    return true;
  }

  return false;
}

/**
 * Debounced per-group cleanup gate. Only one request per cooldown window wins
 * the right to run cleanup, which avoids duplicate work during join bursts.
 */
export async function cleanupDeviceAccessIfDue(groupId: string): Promise<void> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - DEVICE_ACCESS_CLEANUP_COOLDOWN_MS);

  const claim = await db.group.updateMany({
    where: {
      id: groupId,
      OR: [{ lastDeviceAccessCleanupAt: null }, { lastDeviceAccessCleanupAt: { lt: cutoff } }],
    },
    data: { lastDeviceAccessCleanupAt: now },
  });

  if (claim.count === 0) return;

  try {
    await cleanupDeviceAccess(groupId);
  } catch (err) {
    console.error("DeviceAccess cleanup failed", err);
    await db.group
      .update({
        where: { id: groupId },
        data: { lastDeviceAccessCleanupAt: null },
      })
      .catch(() => {});
  }
}

/**
 * Cleanup policy:
 * 1. Delete unclaimed rows older than UNCLAIMED_STALE_THRESHOLD_MS.
 * 2. Delete any rows older than STALE_THRESHOLD_MS.
 * 3. Keep only the most recent rows, with these preferences:
 *    - up to MAX_DEVICES_PER_MEMBER per identified member
 *    - up to MAX_UNCLAIMED_DEVICES unclaimed rows
 *    - up to a dynamic per-group cap based on member count
 */
async function cleanupDeviceAccess(groupId: string): Promise<void> {
  const now = Date.now();
  const unclaimedStaleDate = new Date(now - UNCLAIMED_STALE_THRESHOLD_MS);
  const staleDate = new Date(now - STALE_THRESHOLD_MS);

  // Step 1: delete stale unclaimed rows
  await db.deviceAccess.deleteMany({
    where: {
      groupId,
      memberId: null,
      lastUsedAt: { lt: unclaimedStaleDate },
    },
  });

  // Step 2: delete long-stale rows of any kind
  await db.deviceAccess.deleteMany({
    where: {
      groupId,
      lastUsedAt: { lt: staleDate },
    },
  });

  // Step 3: enforce smart retention policy
  const [memberCount, accesses] = await Promise.all([
    db.groupMember.count({ where: { groupId } }),
    db.deviceAccess.findMany({
      where: { groupId },
      orderBy: { lastUsedAt: "desc" },
      select: { id: true, memberId: true },
    }),
  ]);

  const maxDevicesForMembers = memberCount * MAX_DEVICES_PER_MEMBER;
  const groupCap = Math.max(MIN_DEVICES_PER_GROUP, maxDevicesForMembers + GROUP_DEVICE_BUFFER);

  if (accesses.length <= groupCap) return;

  const keptIds = new Set<string>();
  const keptPerMember = new Map<string, number>();
  let keptUnclaimed = 0;

  for (const access of accesses) {
    if (keptIds.size >= groupCap) break;

    if (!access.memberId) {
      if (keptUnclaimed >= MAX_UNCLAIMED_DEVICES) continue;
      keptUnclaimed += 1;
      keptIds.add(access.id);
      continue;
    }

    const seen = keptPerMember.get(access.memberId) ?? 0;
    if (seen >= MAX_DEVICES_PER_MEMBER) continue;

    keptPerMember.set(access.memberId, seen + 1);
    keptIds.add(access.id);
  }

  const toDelete = accesses.filter((access) => !keptIds.has(access.id)).map((access) => access.id);

  if (toDelete.length > 0) {
    await db.deviceAccess.deleteMany({
      where: { id: { in: toDelete } },
    });
  }
}
