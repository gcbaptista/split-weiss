"use server";
import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";

import { buildDelta, buildStateSnapshot } from "@/lib/audit/snapshot";
import { db } from "@/lib/db";
import { canAccessGroup, getCurrentMemberId } from "@/lib/group-access";
import { calculateLock, calculatePercentage } from "@/lib/splitting";
import { createExpenseSchema } from "@/lib/validations/expense.schema";
import type { ActionResult } from "@/types/api";
import type { ExpenseAuditLogEntry } from "@/types/audit";
import type { Expense, ExpenseBreakdownClient, ExpenseWithSplitsClient } from "@/types/database";

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

export async function createExpense(formData: unknown): Promise<ActionResult<Expense>> {
  const parsed = createExpenseSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };
  const { groupId, splits: splitInputs, splitMode, amount, date, ...rest } = parsed.data;

  if (!(await canAccessGroup(groupId))) {
    return { error: "Can't access this group" };
  }

  try {
    const total = new Decimal(amount);
    const actorId = await getCurrentMemberId(groupId);
    const mappedInputs = splitInputs.map((s) => ({ ...s, isLocked: s.isLocked ?? false }));
    const splitResults =
      splitMode === "PERCENTAGE"
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
          actorId,
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
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
  });

  // Convert Decimal to string for Client Components
  return expenses.map((e) => ({
    ...e,
    amount: e.amount.toString(),
    splits: e.splits.map((s) => ({
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
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
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
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };
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
    const actorId = await getCurrentMemberId(existing.groupId);
    const mappedInputs = splitInputs.map((s) => ({ ...s, isLocked: s.isLocked ?? false }));
    const splitResults =
      splitMode === "PERCENTAGE"
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
          actorId,
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

export async function deleteExpense(
  expenseId: string
): Promise<ActionResult<{ auditLogId: string }>> {
  const expense = await db.expense.findUnique({
    where: { id: expenseId },
    select: { groupId: true, payerId: true },
  });
  if (!expense) return { error: "Expense not found" };

  if (!(await canAccessGroup(expense.groupId))) {
    return { error: "Can't access this group" };
  }

  try {
    const actorId = await getCurrentMemberId(expense.groupId);
    const auditLogId = await db.$transaction(async (tx) => {
      const full = await tx.expense.findUnique({
        where: { id: expenseId },
        include: {
          splits: { include: { user: { select: memberSelect } } },
          payer: { select: memberSelect },
        },
      });
      if (!full) throw new Error("Expense not found");
      const auditLog = await tx.expenseAuditLog.create({
        data: {
          originalExpenseId: expenseId,
          expenseId,
          groupId: expense.groupId,
          actorId,
          action: "DELETED",
          snapshot: {
            action: "DELETED",
            state: buildStateSnapshot(full, full.splits),
          } as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.expense.delete({ where: { id: expenseId } });
      return auditLog.id;
    });
    revalidatePath(`/groups/${expense.groupId}`);
    revalidatePath(`/groups/${expense.groupId}/balances`);
    revalidatePath(`/groups/${expense.groupId}/settlements`);
    return { data: { auditLogId } };
  } catch (e) {
    console.error("deleteExpense failed", e);
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
    orderBy: { createdAt: "desc" },
  });
  return { data: logs as unknown as ExpenseAuditLogEntry[] };
}

export async function getMemberAuditLog(
  groupId: string,
  memberId: string
): Promise<ActionResult<ExpenseAuditLogEntry[]>> {
  if (!(await canAccessGroup(groupId))) {
    return { error: "Can't access this group" };
  }

  const logs = await db.expenseAuditLog.findMany({
    where: { groupId, actorId: memberId },
    include: {
      actor: { select: { id: true, name: true } },
      expense: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { data: logs as unknown as ExpenseAuditLogEntry[] };
}

export async function revertExpense(auditLogId: string): Promise<ActionResult<Expense>> {
  const logEntry = await db.expenseAuditLog.findUnique({
    where: { id: auditLogId },
  });
  if (!logEntry) return { error: "Audit entry not found" };

  if (!(await canAccessGroup(logEntry.groupId))) {
    return { error: "Can't access this group" };
  }

  const snapshot = logEntry.snapshot as unknown as
    | { action: "UPDATED"; delta: import("@/types/audit").ExpenseDelta }
    | { action: "DELETED"; state: import("@/types/audit").ExpenseStateSnapshot };

  if (snapshot.action !== "UPDATED" && snapshot.action !== "DELETED") {
    return { error: "Can only revert updates or deletions" };
  }

  try {
    const actorId = await getCurrentMemberId(logEntry.groupId);

    if (snapshot.action === "DELETED") {
      const state = snapshot.state;
      const expense = await db.$transaction(async (tx) => {
        const created = await tx.expense.create({
          data: {
            groupId: logEntry.groupId,
            payerId: state.payerId,
            title: state.title,
            amount: state.amount,
            currency: state.currency,
            splitMode: state.splitMode as "PERCENTAGE" | "LOCK",
            date: new Date(state.date),
            splits: {
              create: state.splits.map((s) => ({
                userId: s.userId,
                amount: s.amount,
                isLocked: s.isLocked,
              })),
            },
          },
          include: {
            splits: { include: { user: { select: memberSelect } } },
            payer: { select: memberSelect },
          },
        });
        // Link old audit entries to the new expense
        await tx.expenseAuditLog.updateMany({
          where: { originalExpenseId: logEntry.originalExpenseId },
          data: { expenseId: created.id },
        });
        await tx.expenseAuditLog.create({
          data: {
            originalExpenseId: logEntry.originalExpenseId,
            expenseId: created.id,
            groupId: logEntry.groupId,
            actorId,
            action: "REVERTED",
            snapshot: { action: "REVERTED", delta: {} } as unknown as Prisma.InputJsonValue,
          },
        });
        return created;
      });
      revalidatePath(`/groups/${logEntry.groupId}`);
      revalidatePath(`/groups/${logEntry.groupId}/balances`);
      revalidatePath(`/groups/${logEntry.groupId}/settlements`);
      return { data: serializeExpenseForResult(expense) };
    }

    // UPDATED — apply the `from` side of the delta
    const delta = snapshot.delta;
    const existing = await db.expense.findUnique({
      where: { id: logEntry.originalExpenseId },
      include: {
        splits: { include: { user: { select: memberSelect } } },
        payer: { select: memberSelect },
      },
    });
    if (!existing) return { error: "Expense no longer exists" };

    const expense = await db.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {};
      if (delta.title) updateData.title = delta.title.from;
      if (delta.amount) updateData.amount = delta.amount.from;
      if (delta.currency) updateData.currency = delta.currency.from;
      if (delta.splitMode) updateData.splitMode = delta.splitMode.from;
      if (delta.date) updateData.date = new Date(delta.date.from);
      if (delta.payerId) {
        updateData.payerId = delta.payerId.from;
      }

      if (delta.splits) {
        await tx.expenseSplit.deleteMany({ where: { expenseId: existing.id } });
        updateData.splits = {
          create: delta.splits.from.map((s) => ({
            userId: s.userId,
            amount: s.amount,
            isLocked: s.isLocked,
          })),
        };
      }

      const updated = await tx.expense.update({
        where: { id: existing.id },
        data: updateData,
        include: {
          splits: { include: { user: { select: memberSelect } } },
          payer: { select: memberSelect },
        },
      });

      await tx.expenseAuditLog.create({
        data: {
          originalExpenseId: existing.id,
          expenseId: existing.id,
          groupId: logEntry.groupId,
          actorId,
          action: "REVERTED",
          snapshot: {
            action: "REVERTED",
            delta: buildDelta(existing, existing.splits, updated, updated.splits),
          } as unknown as Prisma.InputJsonValue,
        },
      });
      return updated;
    });

    revalidatePath(`/groups/${logEntry.groupId}`);
    revalidatePath(`/groups/${logEntry.groupId}/balances`);
    revalidatePath(`/groups/${logEntry.groupId}/settlements`);
    return { data: serializeExpenseForResult(expense) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to revert expense" };
  }
}
