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
    const memberCount = await db.groupMember.count({ where: { groupId } });
    if (memberCount <= 1) {
      return { error: "A group needs at least one person" };
    }

    await db.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
    revalidatePath(`/groups/${groupId}`);
    return { data: undefined };
  } catch {
    return { error: "Couldn't remove them" };
  }
}
