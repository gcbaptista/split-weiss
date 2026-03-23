import { z } from "zod";

export const createGroupSchema = z.object({
  creatorName: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  currency: z.string().length(3),
  emoji: z.string().optional(),
  password: z
    .string()
    .max(100)
    .optional()
    .refine((val) => !val || val.length >= 4, {
      message: "Password must be at least 4 characters",
    }),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  emoji: z.string().optional().nullable(),
});

export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

export const addMemberSchema = z.object({
  groupId: z.string(),
  name: z.string().min(1).max(100),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const verifyGroupPasswordSchema = z.object({
  groupId: z.string(),
  password: z.string().min(1),
});

export const updateGroupPasswordSchema = z.object({
  password: z.string().min(4).max(100).optional().nullable(),
});

export type VerifyGroupPasswordInput = z.infer<typeof verifyGroupPasswordSchema>;
export type UpdateGroupPasswordInput = z.infer<typeof updateGroupPasswordSchema>;
