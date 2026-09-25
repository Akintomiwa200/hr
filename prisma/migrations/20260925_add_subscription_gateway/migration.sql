-- AlterTable
ALTER TABLE "Company" ADD COLUMN "subscriptionProvider" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "gatewayReference" TEXT,
ADD COLUMN "gatewayCheckoutUrl" TEXT,
ADD COLUMN "gatewayLinkedAt" TIMESTAMP(3),
ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lockedAt" TIMESTAMP(3);

-- Backfill: every already-created account defaults to the unlocked Free tier.
-- Paid plans are re-tied through the Selar gateway going forward.
UPDATE "Company" SET
  "plan" = 'free',
  "subscriptionStatus" = 'ACTIVE',
  "subscriptionProvider" = 'manual',
  "gatewayLinkedAt" = "createdAt";