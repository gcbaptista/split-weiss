"use server";
import { db } from "@/lib/db";
import {
  getDeviceTokenFromCookies,
  setDeviceTokenCookie,
} from "@/lib/device-token-server";
import {
  generateDeviceToken,
  registerDeviceAccess,
} from "@/lib/device-token";
import {
  createGroupSchema,
  updateGroupSchema,
  verifyGroupPasswordSchema,
  updateGroupPasswordSchema,
} from "@/lib/validations/group.schema";
import { hashPassword } from "@/lib/password";
import { canAccessGroup, unlockGroupAccess } from "@/lib/group-access";
import { buildParticipantData } from "@/lib/participants";
import { rememberRecentGroup } from "@/lib/recent-groups";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/api";
import type { Group } from "@/types/database";

async function trustCurrentDeviceForGroup(groupId: string) {
  const deviceToken = (await getDeviceTokenFromCookies()) ?? generateDeviceToken();

  await registerDeviceAccess(groupId, deviceToken);
  await setDeviceTokenCookie(deviceToken);
}

export async function createGroup(formData: unknown): Promise<ActionResult<Group>> {
  const parsed = createGroupSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const { creatorName, password, emoji, ...groupData } = parsed.data;
    const passwordHash = password ? await hashPassword(password) : null;
    const group = await db.group.create({
      data: {
        ...groupData,
        emoji: emoji?.trim() ? emoji.trim() : null,
        passwordHash,
        members: {
          create: {
            role: "MEMBER",
            user: {
              create: buildParticipantData(creatorName),
            },
          },
        },
      },
    });

    if (passwordHash) {
      await trustCurrentDeviceForGroup(group.id);
    }

    await rememberRecentGroup(group.id);

    revalidatePath("/");
    revalidatePath("/groups");
    return { data: group };
  } catch (error) {
    console.error("createGroup failed", error);
    return { error: "Failed to create group" };
  }
}

export async function updateGroup(
  groupId: string,
  formData: unknown
): Promise<ActionResult<Group>> {
  const parsed = updateGroupSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (!(await canAccessGroup(groupId))) {
    return { error: "Can't access this group" };
  }

  try {
    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if ("emoji" in parsed.data) {
      const raw = parsed.data.emoji;
      data.emoji = typeof raw === "string" && raw.trim() ? raw.trim() : null;
    }

    const group = await db.group.update({
      where: { id: groupId },
      data,
    });
    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/groups");
    return { data: group };
  } catch {
    return { error: "Failed to update group" };
  }
}

export async function deleteGroup(groupId: string): Promise<ActionResult> {
  if (!(await canAccessGroup(groupId))) {
    return { error: "Can't access this group" };
  }

  try {
    await db.group.delete({ where: { id: groupId } });
    revalidatePath("/groups");
    return { data: undefined };
  } catch {
    return { error: "Failed to delete group" };
  }
}

export async function unlockGroup(
  formData: unknown
): Promise<ActionResult<{ success: boolean }>> {
  const parsed = verifyGroupPasswordSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { groupId, password } = parsed.data;

  try {
    const result = await unlockGroupAccess(groupId, password);

    if (result === "not-found") {
      return { error: "Couldn't find that group" };
    }

    if (result === "no-password") {
      return { error: "This group doesn't have a password" };
    }

    if (result === "wrong-password") {
      return { error: "Wrong password" };
    }

    return { data: { success: true } };
  } catch {
    return { error: "Couldn't check the password" };
  }
}

export async function rememberRecentGroupVisit(groupId: string): Promise<void> {
  await rememberRecentGroup(groupId);
}

export async function updateGroupPassword(
  groupId: string,
  formData: unknown
): Promise<ActionResult<{ success: boolean }>> {
  const parsed = updateGroupPasswordSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (!(await canAccessGroup(groupId))) {
    return { error: "Can't access this group" };
  }

  try {
    const { password } = parsed.data;
    const passwordHash = password ? await hashPassword(password) : null;

    await db.group.update({
      where: { id: groupId },
      data: { passwordHash },
    });

    await db.deviceAccess.deleteMany({ where: { groupId } });

    if (passwordHash) {
      await trustCurrentDeviceForGroup(groupId);
    }

    revalidatePath(`/groups/${groupId}`);
    return { data: { success: true } };
  } catch {
    return { error: "Couldn't update the password" };
  }
}