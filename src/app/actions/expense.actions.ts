"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createExpenseSchema } from "@/lib/validations/expense.schema";
import {
  calculateEqual,
  calculatePercentage,
  calculateValue,
  calculateLock,
} from "@/lib/splitting";
import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/api";
import type { Expense, ExpenseWithSplitsClient } from "@/types/database";

export async function createExpense(
  formData: unknown
): Promise<ActionResult<Expense>> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const parsed = createExpenseSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { groupId, splits: splitInputs, splitMode, amount, date, ...rest } =
    parsed.data;
  const member = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!member) return { error: "Not a member of this group" };
  try {
    const total = new Decimal(amount);
    let splitResults;
    if (splitMode === "EQUAL") {
      splitResults = calculateEqual(total, splitInputs.map((s) => s.userId));
    } else if (splitMode === "PERCENTAGE") {
      splitResults = calculatePercentage(total, splitInputs.map(s => ({ ...s, isLocked: s.isLocked ?? false })));
    } else if (splitMode === "VALUE") {
      splitResults = calculateValue(total, splitInputs.map(s => ({ ...s, isLocked: s.isLocked ?? false })));
    } else {
      splitResults = calculateLock(total, splitInputs.map(s => ({ ...s, isLocked: s.isLocked ?? false })));
    }
    const expense = await db.expense.create({
      data: {
        ...rest,
        groupId,
        amount,
        splitMode,
        date: new Date(date),
        splits: {
          create: splitResults.map((s) => ({
            userId: s.userId,
            amount: s.amount.toString(),
            isLocked: s.isLocked,
          })),
        },
      },
    });
    revalidatePath(`/groups/${groupId}`);
    revalidatePath(`/groups/${groupId}/balances`);
    return { data: expense };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to create expense",
    };
  }
}

export async function getGroupExpenses(groupId: string): Promise<ExpenseWithSplitsClient[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const member = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!member) return [];
  const expenses = await db.expense.findMany({
    where: { groupId },
    include: { splits: { include: { user: true } }, payer: true },
    orderBy: { date: "desc" },
  });

  // Convert Decimal to string for Client Components
  return expenses.map(e => ({
    ...e,
    amount: e.amount.toString(),
    splits: e.splits.map(s => ({
      ...s,
      amount: s.amount.toString(),
      percentage: s.percentage?.toString() ?? null,
    })),
  }));
}

export async function updateExpense(
  expenseId: string,
  formData: unknown
): Promise<ActionResult<Expense>> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const parsed = createExpenseSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const existing = await db.expense.findUnique({
    where: { id: expenseId },
    select: { groupId: true, payerId: true },
  });
  if (!existing) return { error: "Expense not found" };
  const member = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId: existing.groupId, userId: session.user.id } },
  });
  if (!member) return { error: "Not a member" };
  if (existing.payerId !== session.user.id && member.role !== "ADMIN") {
    return { error: "Only the payer or an admin can edit this expense" };
  }
  const { splits: splitInputs, splitMode, amount, date, ...rest } = parsed.data;
  try {
    const total = new Decimal(amount);
    let splitResults;
    if (splitMode === "EQUAL") {
      splitResults = calculateEqual(total, splitInputs.map((s) => s.userId));
    } else if (splitMode === "PERCENTAGE") {
      splitResults = calculatePercentage(total, splitInputs.map(s => ({ ...s, isLocked: s.isLocked ?? false })));
    } else if (splitMode === "VALUE") {
      splitResults = calculateValue(total, splitInputs.map(s => ({ ...s, isLocked: s.isLocked ?? false })));
    } else {
      splitResults = calculateLock(total, splitInputs.map(s => ({ ...s, isLocked: s.isLocked ?? false })));
    }
    const expense = await db.$transaction(async (tx) => {
      await tx.expenseSplit.deleteMany({ where: { expenseId } });
      return tx.expense.update({
        where: { id: expenseId },
        data: {
          ...rest,
          amount,
          splitMode,
          date: new Date(date),
          splits: {
            create: splitResults.map((s) => ({
              userId: s.userId,
              amount: s.amount.toString(),
              isLocked: s.isLocked,
            })),
          },
        },
      });
    });
    revalidatePath(`/groups/${existing.groupId}`);
    revalidatePath(`/groups/${existing.groupId}/balances`);
    return { data: expense };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update expense" };
  }
}

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const expense = await db.expense.findUnique({
    where: { id: expenseId },
    select: { groupId: true, payerId: true },
  });
  if (!expense) return { error: "Expense not found" };
  const member = await db.groupMember.findUnique({
    where: {
      groupId_userId: { groupId: expense.groupId, userId: session.user.id },
    },
  });
  if (!member) return { error: "Not a member" };
  if (expense.payerId !== session.user.id && member.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }
  try {
    await db.expense.delete({ where: { id: expenseId } });
    revalidatePath(`/groups/${expense.groupId}`);
    revalidatePath(`/groups/${expense.groupId}/balances`);
    return { data: undefined };
  } catch {
    return { error: "Failed to delete expense" };
  }
}
