import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  currency: z.string().length(3),
  emoji: z.string().optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().optional(),
});

export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

export const addMemberSchema = z.object({
  groupId: z.string(),
  email: z.string().email(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
