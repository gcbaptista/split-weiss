"use server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { generateDeviceToken, registerDeviceAccess } from "@/lib/device-token";
import { getDeviceTokenFromCookies, setDeviceTokenCookie } from "@/lib/device-token-server";
import { canAccessGroup, getCurrentMemberId, unlockGroupAccess } from "@/lib/group-access";
import { hashPassword } from "@/lib/password";
import { rememberRecentGroup } from "@/lib/recent-groups";
import {
  createGroupSchema,
  updateGroupPasswordSchema,
  updateGroupSchema,
  verifyGroupPasswordSchema,
} from "@/lib/validations/group.schema";
import type { ActionResult } from "@/types/api";
import type { Group } from "@/types/database";

async function ensureDeviceToken(): Promise<string> {
  const existing = await getDeviceTokenFromCookies();
  if (existing) return existing;
  const token = generateDeviceToken();
  await setDeviceTokenCookie(token);
  return token;
}

async function trustCurrentDeviceForGroup(groupId: string, memberId?: string) {
  const deviceToken = await ensureDeviceToken();
  await registerDeviceAccess(groupId, deviceToken);
  if (memberId) {
    await db.deviceAccess.update({
      where: { groupId_deviceToken: { groupId, deviceToken } },
      data: { memberId },
    });
  }
}

export async function createGroup(formData: unknown): Promise<ActionResult<Group>> {
  const parsed = createGroupSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };
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
            name: creatorName.trim(),
          },
        },
      },
      include: { members: { select: { id: true } } },
    });

    // Auto-identify creator on this device
    const creatorMemberId = group.members[0]?.id;
    await trustCurrentDeviceForGroup(group.id, creatorMemberId);

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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  if (!(await canAccessGroup(groupId))) {
    return { error: "Can't access this group" };
  }

  try {
    type GroupUpdatePayload = { name?: string; emoji?: string | null };
    const data: GroupUpdatePayload = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if ("emoji" in parsed.data) {
      const raw = parsed.data.emoji;
      data.emoji = typeof raw === "string" && raw.trim() ? raw.trim() : null;
    }

    const old = await db.group.findUnique({
      where: { id: groupId },
      select: { name: true, emoji: true },
    });
    const group = await db.group.update({
      where: { id: groupId },
      data,
    });
    const actorId = await getCurrentMemberId(groupId);
    await db.groupAuditLog.create({
      data: {
        groupId,
        actorId,
        action: "GROUP_UPDATED",
        details: {
          from: { name: old?.name, emoji: old?.emoji },
          to: { name: group.name, emoji: group.emoji },
        },
      },
    });
    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/groups");
    return { data: group };
  } catch (e) {
    console.error("updateGroup failed", e);
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
  } catch (e) {
    console.error("deleteGroup failed", e);
    return { error: "Failed to delete group" };
  }
}

export async function unlockGroup(formData: unknown): Promise<ActionResult<{ success: boolean }>> {
  const parsed = verifyGroupPasswordSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

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
  } catch (e) {
    console.error("verifyGroupPassword failed", e);
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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

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

    const actorId = await getCurrentMemberId(groupId);
    await db.groupAuditLog.create({
      data: {
        groupId,
        actorId,
        action: "GROUP_PASSWORD_CHANGED",
        details: { hasPassword: !!passwordHash },
      },
    });

    revalidatePath(`/groups/${groupId}`);
    return { data: { success: true } };
  } catch (e) {
    console.error("updateGroupPassword failed", e);
    return { error: "Couldn't update the password" };
  }
}

// TODO(security): This action has no canAccessGroup() check because it is shown to devices
// that are not yet identified (the identity picker appears before group membership is set).
// A device with a known groupId can call this directly to claim any member identity, bypassing
// password protection. Full fix: require a short-lived nonce issued after unlockGroup succeeds,
// and validate that nonce here before allowing identity assignment.
export async function identifyAsMember(groupId: string, memberId: string): Promise<ActionResult> {
  // Verify the member belongs to this group
  const member = await db.groupMember.findFirst({
    where: { id: memberId, groupId },
    select: { id: true },
  });
  if (!member) return { error: "Member not found in this group" };

  const deviceToken = await ensureDeviceToken();

  await db.deviceAccess.upsert({
    where: { groupId_deviceToken: { groupId, deviceToken } },
    create: { groupId, deviceToken, memberId },
    update: { memberId },
  });

  await rememberRecentGroup(groupId);
  revalidatePath(`/groups/${groupId}`);
  return { data: undefined };
}

// TODO(security): Same gap as identifyAsMember above — no canAccessGroup() check. Any device
// with a known groupId can add a new member to any group (including password-protected ones)
// by calling this action directly. Mitigation requires the same nonce-based two-phase flow.
export async function addAndIdentifyAsMember(groupId: string, name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 100) return { error: "Name must be 1-100 characters" };

  const existing = await db.groupMember.findUnique({
    where: { groupId_name: { groupId, name: trimmed } },
  });
  if (existing) return { error: "Someone with that name is already in this group" };

  try {
    const member = await db.groupMember.create({
      data: { groupId, name: trimmed },
    });

    const deviceToken = await ensureDeviceToken();

    await db.deviceAccess.upsert({
      where: { groupId_deviceToken: { groupId, deviceToken } },
      create: { groupId, deviceToken, memberId: member.id },
      update: { memberId: member.id },
    });

    await rememberRecentGroup(groupId);
    revalidatePath(`/groups/${groupId}`);
    return { data: undefined };
  } catch (e) {
    console.error("addAndIdentifyAsMember failed", e);
    return { error: "Couldn't add you to the group" };
  }
}
