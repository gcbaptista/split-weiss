-- Migrate EQUAL expenses to LOCK (calculateLock with all unlocked is identical)
UPDATE "Expense" SET "splitMode" = 'LOCK' WHERE "splitMode" = 'EQUAL';

-- Recreate enum with only PERCENTAGE and LOCK
CREATE TYPE "SplitMode_new" AS ENUM ('PERCENTAGE', 'LOCK');
ALTER TABLE "Expense" ALTER COLUMN "splitMode" TYPE "SplitMode_new" USING "splitMode"::text::"SplitMode_new";
DROP TYPE "SplitMode";
ALTER TYPE "SplitMode_new" RENAME TO "SplitMode";
