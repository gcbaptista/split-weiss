"use server";
import { db } from "@/lib/db";
import { canAccessGroup } from "@/lib/group-access";
import { createSettlementSchema } from "@/lib/validations/settlement.schema";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/api";
import type {
  Settlement,
  SettlementBreakdownClient,
} from "@/types/database";

const userSelect = {
  id: true,
  name: true,
  email: true,
} as const;

export async function createSettlement(
  formData: unknown
): Promise<ActionResult<Settlement>> {
  const parsed = createSettlementSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { groupId, date, ...rest } = parsed.data;

  if (!(await canAccessGroup(groupId))) {
    return { error: "Can't access this group" };
  }

  try {
    const settlement = await db.settlement.create({
      data: { ...rest, groupId, date: new Date(date) },
    });
    revalidatePath(`/groups/${groupId}/balances`);
    revalidatePath(`/groups/${groupId}/settlements`);
    return { data: settlement };
  } catch {
    return { error: "Failed to record settlement" };
  }
}

export async function getGroupSettlements(groupId: string) {
  if (!(await canAccessGroup(groupId))) {
    return [];
  }

  return db.settlement.findMany({
    where: { groupId },
    include: {
      fromUser: { select: userSelect },
      toUser: { select: userSelect },
    },
    orderBy: { date: "desc" },
  });
}

export async function getGroupSettlementHistory(groupId: string) {
  if (!(await canAccessGroup(groupId))) {
    return [];
  }

  return db.settlement.findMany({
    where: { groupId },
    select: {
      id: true,
      fromUserId: true,
      toUserId: true,
      amount: true,
      currency: true,
      date: true,
      note: true,
    },
    orderBy: { date: "desc" },
  });
}

export async function getGroupSettlementsForBreakdown(
  groupId: string
): Promise<SettlementBreakdownClient[]> {
  if (!(await canAccessGroup(groupId))) {
    return [];
  }

  const settlements = await db.settlement.findMany({
    where: { groupId },
    select: {
      id: true,
      fromUserId: true,
      toUserId: true,
      amount: true,
      currency: true,
      date: true,
      fromUser: { select: userSelect },
      toUser: { select: userSelect },
    },
    orderBy: { date: "desc" },
  });

  return settlements.map((settlement) => ({
    ...settlement,
    amount: settlement.amount.toString(),
  }));
}
