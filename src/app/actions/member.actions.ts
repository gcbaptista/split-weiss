"use server";
import { db } from "@/lib/db";
import { canAccessGroup } from "@/lib/group-access";
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
    await db.groupMember.create({
      data: {
        groupId,
        name: name.trim(),
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
  memberId: string
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
        tx.expense.count({ where: { groupId, payerId: memberId } }),
        tx.expenseSplit.count({ where: { userId: memberId, expense: { groupId } } }),
        tx.settlement.count({
          where: {
            groupId,
            OR: [{ fromUserId: memberId }, { toUserId: memberId }],
          },
        }),
        tx.expenseAuditLog.count({ where: { groupId, actorId: memberId } }),
      ]);

      if (paidExpenseCount > 0 || splitCount > 0 || settlementCount > 0 || auditLogCount > 0) {
        return {
          error:
            "Can't remove this person because they appear in this group's expenses or settlements. Delete or reassign their history first.",
        } as const;
      }

      await tx.groupMember.delete({
        where: { id: memberId },
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
  } catch {
    return { error: "Couldn't remove them" };
  }
}
