"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSettlementSchema } from "@/lib/validations/settlement.schema";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/api";
import type { Settlement } from "@/types/database";

export async function createSettlement(
  formData: unknown
): Promise<ActionResult<Settlement>> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const parsed = createSettlementSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { groupId, date, ...rest } = parsed.data;
  const member = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!member) return { error: "Not a member" };
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
  const session = await auth();
  if (!session?.user?.id) return [];
  return db.settlement.findMany({
    where: { groupId },
    include: { fromUser: true, toUser: true },
    orderBy: { date: "desc" },
  });
}
