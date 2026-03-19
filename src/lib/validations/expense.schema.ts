import { z } from "zod";

export const splitEntrySchema = z.object({
  userId: z.string(),
  amount: z.string().optional(),
  percentage: z.string().optional(),
  isLocked: z.boolean().optional(),
});

export const createExpenseSchema = z.object({
  groupId: z.string(),
  title: z.string().min(1).max(200),
  amount: z.string().refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    "Must be positive"
  ),
  currency: z.string().length(3),
  splitMode: z.enum(["PERCENTAGE", "LOCK"]),
  date: z.string(),
  payerId: z.string(),
  splits: z.array(splitEntrySchema),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type SplitEntryInput = z.infer<typeof splitEntrySchema>;
