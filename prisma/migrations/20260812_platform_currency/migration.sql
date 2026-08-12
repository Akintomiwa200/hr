-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "currencyCode" TEXT NOT NULL DEFAULT 'NGN',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- Seed default platform currency (Naira)
INSERT INTO "PlatformSettings" ("id", "currencyCode", "updatedAt")
VALUES ('platform', 'NGN', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
