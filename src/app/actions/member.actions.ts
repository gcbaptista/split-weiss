"use server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { canAccessGroup, getCurrentMemberId } from "@/lib/group-access";
import { addMemberSchema } from "@/lib/validations/group.schema";
import type { ActionResult } from "@/types/api";

export async function addMember(formData: unknown): Promise<ActionResult> {
  const parsed = addMemberSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { groupId, name } = parsed.data;

  if (!(await canAccessGroup(groupId))) {
    return { error: "Can't access this group" };
  }

  const trimmed = name.trim();
  const existing = await db.groupMember.findUnique({
    where: { groupId_name: { groupId, name: trimmed } },
  });
  if (existing) return { error: "Someone with that name is already in this group" };

  try {
    const actorId = await getCurrentMemberId(groupId);
    const member = await db.groupMember.create({
      data: {
        groupId,
        name: trimmed,
      },
    });
    await db.groupAuditLog.create({
      data: {
        groupId,
        actorId,
        action: "MEMBER_ADDED",
        details: { memberId: member.id, name: trimmed },
      },
    });
    revalidatePath(`/groups/${groupId}`);
    revalidatePath(`/groups/${groupId}/balances`);
    revalidatePath(`/groups/${groupId}/settlements`);
    revalidatePath(`/groups/${groupId}/settings`);
    return { data: undefined };
  } catch (error) {
    console.error("addMember failed", error);
    return { error: "Couldn't add them" };
  }
}

export async function renameMember(
  groupId: string,
  memberId: string,
  newName: string
): Promise<ActionResult> {
  if (!(await canAccessGroup(groupId))) {
    return { error: "Can't access this group" };
  }

  const trimmed = newName.trim();
  if (!trimmed || trimmed.length > 100) return { error: "Name must be 1-100 characters" };

  const existing = await db.groupMember.findUnique({
    where: { groupId_name: { groupId, name: trimmed } },
  });
  if (existing && existing.id !== memberId) {
    return { error: "Someone with that name is already in this group" };
  }

  try {
    const actorId = await getCurrentMemberId(groupId);
    const old = await db.groupMember.findUnique({
      where: { id: memberId },
      select: { name: true },
    });
    await db.groupMember.update({
      where: { id: memberId },
      data: { name: trimmed },
    });
    await db.groupAuditLog.create({
      data: {
        groupId,
        actorId,
        action: "MEMBER_RENAMED",
        details: { memberId, from: old?.name, to: trimmed },
      },
    });
    revalidatePath(`/groups/${groupId}`);
    revalidatePath(`/groups/${groupId}/balances`);
    revalidatePath(`/groups/${groupId}/settlements`);
    revalidatePath(`/groups/${groupId}/settings`);
    return { data: undefined };
  } catch (e) {
    console.error("renameMember failed", e);
    return { error: "Couldn't rename them" };
  }
}

export async function removeMember(groupId: string, memberId: string): Promise<ActionResult> {
  if (!(await canAccessGroup(groupId))) {
    return { error: "Can't access this group" };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const memberCount = await tx.groupMember.count({ where: { groupId } });
      if (memberCount <= 1) {
        return { error: "A group needs at least one person" } as const;
      }

      const [paidExpenseCount, splitCount, settlementCount] = await Promise.all([
        tx.expense.count({ where: { groupId, payerId: memberId } }),
        tx.expenseSplit.count({ where: { userId: memberId, expense: { groupId } } }),
        tx.settlement.count({
          where: {
            groupId,
            OR: [{ fromUserId: memberId }, { toUserId: memberId }],
          },
        }),
      ]);

      if (paidExpenseCount > 0 || splitCount > 0 || settlementCount > 0) {
        return {
          error:
            "Can't remove this person because they appear in this group's expenses or settlements. Delete or reassign their history first.",
        } as const;
      }

      const member = await tx.groupMember.findUnique({
        where: { id: memberId },
        select: { name: true },
      });
      await tx.groupMember.delete({
        where: { id: memberId },
      });
      const actorId = await getCurrentMemberId(groupId);
      await tx.groupAuditLog.create({
        data: {
          groupId,
          actorId,
          action: "MEMBER_REMOVED",
          details: { memberId, name: member?.name },
        },
      });

      return { error: null } as const;
    });

    if (result.error) {
      return { error: result.error };
    }

    revalidatePath(`/groups/${groupId}`);
    revalidatePath(`/groups/${groupId}/balances`);
    revalidatePath(`/groups/${groupId}/settlements`);
    revalidatePath(`/groups/${groupId}/settings`);
    return { data: undefined };
  } catch (e) {
    console.error("removeMember failed", e);
    return { error: "Couldn't remove them" };
  }
}
