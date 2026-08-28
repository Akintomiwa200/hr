-- AlterTable
ALTER TABLE "AttendanceDevice" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "AttendanceDevice" ADD COLUMN "commPort" INTEGER NOT NULL DEFAULT 4370;
