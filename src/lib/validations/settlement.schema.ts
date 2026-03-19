import { z } from "zod";

export const createSettlementSchema = z.object({
  groupId: z.string(),
  fromUserId: z.string(),
  toUserId: z.string(),
  amount: z.string().refine((v) => parseFloat(v) > 0, "Must be positive"),
  currency: z.string().length(3),
  date: z.string(),
  note: z.string().optional(),
});

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
