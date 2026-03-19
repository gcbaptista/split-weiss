import { randomBytes } from "crypto";
import { db } from "@/lib/db";

export function generateDeviceToken(): string {
  return randomBytes(32).toString("hex");
}

export async function registerDeviceAccess(
  groupId: string,
  deviceToken: string
): Promise<void> {
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

export async function verifyDeviceAccess(
  groupId: string,
  deviceToken: string
): Promise<boolean> {
  const access = await db.deviceAccess.findUnique({
    where: {
      groupId_deviceToken: {
        groupId,
        deviceToken,
      },
    },
  });

  if (access) {
    await db.deviceAccess.update({
      where: { id: access.id },
      data: { lastUsedAt: new Date() },
    });
    return true;
  }

  return false;
}

