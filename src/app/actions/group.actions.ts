"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createGroupSchema } from "@/lib/validations/group.schema";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/api";
import type { Group } from "@/types/database";

export async function createGroup(formData: unknown): Promise<ActionResult<Group>> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const parsed = createGroupSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const group = await db.group.create({
      data: {
        ...parsed.data,
        members: { create: { userId: session.user.id, role: "ADMIN" } },
      },
    });
    revalidatePath("/groups");
    return { data: group };
  } catch {
    return { error: "Failed to create group" };
  }
}

export async function getUserGroups() {
  const session = await auth();
  if (!session?.user?.id) return [];
  return db.group.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: {
      members: { include: { user: true } },
      _count: { select: { expenses: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getGroup(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.group.findFirst({
    where: { id: groupId, members: { some: { userId: session.user.id } } },
    include: { members: { include: { user: true } } },
  });
}

export async function deleteGroup(groupId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const member = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (member?.role !== "ADMIN") return { error: "Only admins can delete groups" };
  try {
    await db.group.delete({ where: { id: groupId } });
    revalidatePath("/groups");
    return { data: undefined };
  } catch {
    return { error: "Failed to delete group" };
  }
}
