import { randomBytes } from "crypto";

import { db } from "@/lib/db";

const ACCESS_TOUCH_INTERVAL_MS = 60 * 60 * 1000;

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
