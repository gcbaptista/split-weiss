"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addMemberSchema } from "@/lib/validations/group.schema";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/api";

export async function addMember(formData: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const parsed = addMemberSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { groupId, email } = parsed.data;
  const requester = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!requester) return { error: "Not a member of this group" };
  const targetUser = await db.user.findUnique({ where: { email } });
  if (!targetUser) return { error: "No user found with that email" };
  const existing = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUser.id } },
  });
  if (existing) return { error: "User is already a member" };
  try {
    await db.groupMember.create({
      data: { groupId, userId: targetUser.id, role: "MEMBER" },
    });
    revalidatePath(`/groups/${groupId}`);
    return { data: undefined };
  } catch {
    return { error: "Failed to add member" };
  }
}

export async function removeMember(
  groupId: string,
  userId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const requester = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (requester?.role !== "ADMIN" && session.user.id !== userId) {
    return { error: "Unauthorized" };
  }
  try {
    await db.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
    revalidatePath(`/groups/${groupId}`);
    return { data: undefined };
  } catch {
    return { error: "Failed to remove member" };
  }
}
