/**
 * Migration: Collapse User + GroupMember into a single GroupMember table.
 *
 * Strategy:
 * - Set GroupMember.id = GroupMember.userId (so all existing FK values automatically work)
 * - Copy User.name into GroupMember.name
 * - Drop the User table and all its FK constraints
 * - Re-add FK constraints pointing to GroupMember.id
 */
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
if (!process.env.DATABASE_URL) dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== Collapsing User + GroupMember into GroupMember ===\n");

  // 1. Verify 1:1 mapping assumption
  const multiGroupUsers = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM (
       SELECT "userId" FROM "GroupMember" GROUP BY "userId" HAVING COUNT(*) > 1
     ) sub`
  );
  const multiCount = Number(multiGroupUsers[0]?.count ?? 0);
  if (multiCount > 0) {
    console.error(`ERROR: ${multiCount} users belong to multiple groups. Cannot collapse safely.`);
    process.exit(1);
  }
  console.log("✓ Verified 1:1 User↔GroupMember mapping");

  // 2. Add id and name columns to GroupMember
  console.log("Adding id and name columns to GroupMember...");
  await prisma.$executeRawUnsafe(`ALTER TABLE "GroupMember" ADD COLUMN IF NOT EXISTS "id" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "GroupMember" ADD COLUMN IF NOT EXISTS "name" TEXT`);

  // 3. Populate id = userId, name from User
  console.log("Populating id and name from User...");
  await prisma.$executeRawUnsafe(`
    UPDATE "GroupMember" gm
    SET "id" = gm."userId",
        "name" = u."name"
    FROM "User" u
    WHERE gm."userId" = u."id"
  `);

  // 4. Make id NOT NULL and set as primary key
  console.log("Setting id as primary key...");
  await prisma.$executeRawUnsafe(`ALTER TABLE "GroupMember" ALTER COLUMN "id" SET NOT NULL`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "GroupMember" ALTER COLUMN "name" SET NOT NULL`);

  // Drop old composite primary key / unique constraint
  await prisma.$executeRawUnsafe(`ALTER TABLE "GroupMember" DROP CONSTRAINT IF EXISTS "GroupMember_pkey"`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "GroupMember" DROP CONSTRAINT IF EXISTS "GroupMember_groupId_userId_key"`);

  // Add new primary key on id (skip if already exists)
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "GroupMember" ADD PRIMARY KEY ("id")`);
  } catch { console.log("  (primary key already exists)"); }

  // Add unique constraint (skip if already exists)
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_id_key" UNIQUE ("groupId", "id")`);
  } catch { console.log("  (unique constraint already exists)"); }

  console.log("✓ GroupMember now has id as primary key");

  // 5. Drop old FK constraints referencing User (known constraints)
  console.log("Dropping old FK constraints referencing User...");
  const oldFKs = [
    { table: "GroupMember", constraint: "GroupMember_userId_fkey" },
    { table: "Expense", constraint: "Expense_payerId_fkey" },
    { table: "ExpenseSplit", constraint: "ExpenseSplit_userId_fkey" },
    { table: "Settlement", constraint: "Settlement_fromUserId_fkey" },
    { table: "Settlement", constraint: "Settlement_toUserId_fkey" },
    { table: "ExpenseAuditLog", constraint: "ExpenseAuditLog_actorId_fkey" },
  ];
  for (const { table, constraint } of oldFKs) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraint}"`);
    console.log(`  Dropped ${table}.${constraint}`);
  }

  // 6. Add new FK constraints referencing GroupMember
  console.log("Adding new FK constraints referencing GroupMember...");
  const newFKs = [
    { table: "Expense", col: "payerId" },
    { table: "ExpenseSplit", col: "userId" },
    { table: "Settlement", col: "fromUserId" },
    { table: "Settlement", col: "toUserId" },
    { table: "ExpenseAuditLog", col: "actorId" },
  ];
  for (const { table, col } of newFKs) {
    const name = `${table}_${col}_fkey`;
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" ADD CONSTRAINT "${name}" FOREIGN KEY ("${col}") REFERENCES "GroupMember"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
    console.log(`  ✓ ${table}.${col} → GroupMember.id`);
  }

  // 7. Drop userId column from GroupMember (no longer needed)
  console.log("Dropping userId and role columns from GroupMember...");
  await prisma.$executeRawUnsafe(`ALTER TABLE "GroupMember" DROP COLUMN IF EXISTS "userId"`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "GroupMember" DROP COLUMN IF EXISTS "role"`);

  // 8. Drop User table
  console.log("Dropping User table...");
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "User" CASCADE`);

  // 9. Drop GroupRole enum
  console.log("Dropping GroupRole enum...");
  await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "GroupRole"`);

  console.log("\n=== Migration complete ===");
  console.log("Next steps:");
  console.log("  1. Update prisma/schema.prisma");
  console.log("  2. Run: npx prisma db push");
  console.log("  3. Update application code");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

