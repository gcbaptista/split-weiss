"use server";
import { db } from "@/lib/db";
import { signUpSchema } from "@/lib/validations/auth.schema";
import bcrypt from "bcryptjs";
import type { ActionResult } from "@/types/api";

export async function signUp(formData: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Email already in use" };
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await db.user.create({ data: { name, email, passwordHash } });
    return { data: undefined };
  } catch {
    return { error: "Failed to create account" };
  }
}
