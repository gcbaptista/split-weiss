"use server";
import { db } from "@/lib/db";
import { canAccessGroup } from "@/lib/group-access";
import type { Prisma } from "@prisma/client";
import { createExpenseSchema } from "@/lib/validations/expense.schema";
import {
  calculatePercentage,
  calculateLock,
} from "@/lib/splitting";
import { buildStateSnapshot, buildDelta } from "@/lib/audit/snapshot";
import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/api";
import type { Expense, ExpenseBreakdownClient, ExpenseWithSplitsClient } from "@/types/database";
import type { ExpenseAuditLogEntry } from "@/types/audit";

const memberSelect = {
  id: true,
  name: true,
} as const;

function serializeExpenseForResult(expense: Expense): Expense {
  return {
    id: expense.id,
    groupId: expense.groupId,
    payerId: expense.payerId,
    title: expense.title,
    amount: expense.amount.toString(),
    currency: expense.currency,
    splitMode: expense.splitMode,
    date: expense.date,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  } as unknown as Expense;
}

export async function createExpense(
  formData: unknown
): Promise<ActionResult<Expense>> {
  const parsed = createExpenseSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { groupId, splits: splitInputs, splitMode, amount, date, ...rest } =
    parsed.data;

  if (!(await canAccessGroup(groupId))) {
    return { error: "Can't access this group" };
  }

  try {
    const total = new Decimal(amount);
    const mappedInputs = splitInputs.map(s => ({ ...s, isLocked: s.isLocked ?? false }));
    const splitResults = splitMode === "PERCENTAGE"
      ? calculatePercentage(total, mappedInputs)
      : calculateLock(total, mappedInputs);
    const expense = await db.$transaction(async (tx) => {
      const created = await tx.expense.create({
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
        include: {
          splits: { include: { user: { select: memberSelect } } },
          payer: { select: memberSelect },
        },
      });
      await tx.expenseAuditLog.create({
        data: {
          originalExpenseId: created.id,
          expenseId: created.id,
          groupId: created.groupId,
          actorId: rest.payerId,
          action: "CREATED",
          snapshot: { action: "CREATED" } as unknown as Prisma.InputJsonValue,
        },
      });
      return created;
    });
    revalidatePath(`/groups/${groupId}`);
    revalidatePath(`/groups/${groupId}/balances`);
    revalidatePath(`/groups/${groupId}/settlements`);
    return { data: serializeExpenseForResult(expense) };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to create expense",
    };
  }
}

export async function getGroupExpenses(groupId: string): Promise<ExpenseWithSplitsClient[]> {
  if (!(await canAccessGroup(groupId))) {
    return [];
  }

  const expenses = await db.expense.findMany({
    where: { groupId },
    include: {
      splits: { include: { user: { select: memberSelect } } },
      payer: { select: memberSelect },
    },
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

export async function getGroupExpensesForCalculation(groupId: string) {
  if (!(await canAccessGroup(groupId))) {
    return [];
  }

  return db.expense.findMany({
    where: { groupId },
    select: {
      payerId: true,
      currency: true,
      date: true,
      amount: true,
      splits: {
        select: {
          userId: true,
          amount: true,
        },
      },
    },
    orderBy: { date: "desc" },
  });
}

export async function getGroupExpensesForBreakdown(
  groupId: string
): Promise<ExpenseBreakdownClient[]> {
  if (!(await canAccessGroup(groupId))) {
    return [];
  }

  const expenses = await db.expense.findMany({
    where: { groupId },
    select: {
      id: true,
      title: true,
      payerId: true,
      currency: true,
      date: true,
      amount: true,
      payer: { select: memberSelect },
      splits: {
        select: {
          userId: true,
          amount: true,
        },
      },
    },
    orderBy: { date: "desc" },
  });

  return expenses.map((expense) => ({
    ...expense,
    amount: expense.amount.toString(),
    splits: expense.splits.map((split) => ({
      ...split,
      amount: split.amount.toString(),
    })),
  }));
}

export async function updateExpense(
  expenseId: string,
  formData: unknown
): Promise<ActionResult<Expense>> {
  const parsed = createExpenseSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const existing = await db.expense.findUnique({
    where: { id: expenseId },
    include: {
      splits: { include: { user: { select: memberSelect } } },
      payer: { select: memberSelect },
    },
  });
  if (!existing) return { error: "Expense not found" };

  if (!(await canAccessGroup(existing.groupId))) {
    return { error: "Can't access this group" };
  }

  const { splits: splitInputs, splitMode, amount, date, ...rest } = parsed.data;
  try {
    const total = new Decimal(amount);
    const mappedInputs = splitInputs.map(s => ({ ...s, isLocked: s.isLocked ?? false }));
    const splitResults = splitMode === "PERCENTAGE"
      ? calculatePercentage(total, mappedInputs)
      : calculateLock(total, mappedInputs);
    const expense = await db.$transaction(async (tx) => {
      await tx.expenseSplit.deleteMany({ where: { expenseId } });
      const updated = await tx.expense.update({
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
        include: {
          splits: { include: { user: { select: memberSelect } } },
          payer: { select: memberSelect },
        },
      });
      await tx.expenseAuditLog.create({
        data: {
          originalExpenseId: expenseId,
          expenseId,
          groupId: existing.groupId,
          actorId: rest.payerId,
          action: "UPDATED",
          snapshot: {
            action: "UPDATED",
            delta: buildDelta(existing, existing.splits, updated, updated.splits),
          } as unknown as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
    revalidatePath(`/groups/${existing.groupId}`);
    revalidatePath(`/groups/${existing.groupId}/balances`);
    revalidatePath(`/groups/${existing.groupId}/settlements`);
    return { data: serializeExpenseForResult(expense) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update expense" };
  }
}

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  const expense = await db.expense.findUnique({
    where: { id: expenseId },
    select: { groupId: true, payerId: true },
  });
  if (!expense) return { error: "Expense not found" };

  if (!(await canAccessGroup(expense.groupId))) {
    return { error: "Can't access this group" };
  }

  try {
    await db.$transaction(async (tx) => {
      const full = await tx.expense.findUnique({
        where: { id: expenseId },
        include: {
          splits: { include: { user: { select: memberSelect } } },
          payer: { select: memberSelect },
        },
      });
      if (!full) throw new Error("Expense not found");
      await tx.expenseAuditLog.create({
        data: {
          originalExpenseId: expenseId,
          expenseId,
          groupId: expense.groupId,
          actorId: expense.payerId,
          action: "DELETED",
          snapshot: { action: "DELETED", state: buildStateSnapshot(full, full.splits) } as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.expense.delete({ where: { id: expenseId } });
    });
    revalidatePath(`/groups/${expense.groupId}`);
    revalidatePath(`/groups/${expense.groupId}/balances`);
    revalidatePath(`/groups/${expense.groupId}/settlements`);
    return { data: undefined };
  } catch {
    return { error: "Failed to delete expense" };
  }
}

export async function getExpenseAuditLog(
  expenseId: string
): Promise<ActionResult<ExpenseAuditLogEntry[]>> {
  const firstLog = await db.expenseAuditLog.findFirst({
    where: { originalExpenseId: expenseId },
    select: { groupId: true },
  });
  if (!firstLog) return { data: [] };

  if (!(await canAccessGroup(firstLog.groupId))) {
    return { error: "Can't access this group" };
  }

  const logs = await db.expenseAuditLog.findMany({
    where: { originalExpenseId: expenseId },
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return { data: logs as unknown as ExpenseAuditLogEntry[] };
}
