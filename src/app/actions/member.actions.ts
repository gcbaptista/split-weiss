"use server";
import { db } from "@/lib/db";
import { canAccessGroup } from "@/lib/group-access";
import { buildParticipantData } from "@/lib/participants";
import { addMemberSchema } from "@/lib/validations/group.schema";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/api";

export async function addMember(formData: unknown): Promise<ActionResult> {
  const parsed = addMemberSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { groupId, name } = parsed.data;

  if (!(await canAccessGroup(groupId))) {
    return { error: "Can't access this group" };
  }

  try {
    await db.group.update({
      where: { id: groupId },
      data: {
        members: {
          create: {
            role: "MEMBER",
            user: {
              create: buildParticipantData(name),
            },
          },
        },
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

export async function removeMember(
  groupId: string,
  userId: string
): Promise<ActionResult> {
  if (!(await canAccessGroup(groupId))) {
    return { error: "Can't access this group" };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const memberCount = await tx.groupMember.count({ where: { groupId } });
      if (memberCount <= 1) {
        return { error: "A group needs at least one person" } as const;
      }

      const [paidExpenseCount, splitCount, settlementCount, auditLogCount] = await Promise.all([
        tx.expense.count({ where: { groupId, payerId: userId } }),
        tx.expenseSplit.count({ where: { userId, expense: { groupId } } }),
        tx.settlement.count({
          where: {
            groupId,
            OR: [{ fromUserId: userId }, { toUserId: userId }],
          },
        }),
        tx.expenseAuditLog.count({ where: { groupId, actorId: userId } }),
      ]);

      if (paidExpenseCount > 0 || splitCount > 0 || settlementCount > 0 || auditLogCount > 0) {
        return {
          error:
            "Can't remove this person because they appear in this group's expenses or settlements. Delete or reassign their history first.",
        } as const;
      }

      await tx.groupMember.delete({
        where: { groupId_userId: { groupId, userId } },
      });

      const [remainingMemberships, remainingExpenses, remainingSplits, remainingSettlements, remainingAuditLogs] =
        await Promise.all([
          tx.groupMember.count({ where: { userId } }),
          tx.expense.count({ where: { payerId: userId } }),
          tx.expenseSplit.count({ where: { userId } }),
          tx.settlement.count({ where: { OR: [{ fromUserId: userId }, { toUserId: userId }] } }),
          tx.expenseAuditLog.count({ where: { actorId: userId } }),
        ]);

      if (
        remainingMemberships === 0 &&
        remainingExpenses === 0 &&
        remainingSplits === 0 &&
        remainingSettlements === 0 &&
        remainingAuditLogs === 0
      ) {
        await tx.user.delete({ where: { id: userId } });
      }

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
  } catch {
    return { error: "Couldn't remove them" };
  }
}
