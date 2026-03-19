-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "DeviceAccess" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceAccess_deviceToken_idx" ON "DeviceAccess"("deviceToken");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceAccess_groupId_deviceToken_key" ON "DeviceAccess"("groupId", "deviceToken");

-- AddForeignKey
ALTER TABLE "DeviceAccess" ADD CONSTRAINT "DeviceAccess_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
