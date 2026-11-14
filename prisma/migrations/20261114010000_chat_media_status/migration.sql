-- Chat 2.0: rich messages, group management, statuses and profile details.
-- All changes are additive so existing conversations keep working.

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "chatAbout" TEXT;

-- AlterTable
ALTER TABLE "ChatConversation" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "ChatConversation" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "ChatConversation" ADD COLUMN IF NOT EXISTS "inviteCode" TEXT;

-- AlterTable
ALTER TABLE "ChatParticipant" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'TEXT';
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "attachmentName" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "attachmentMime" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "attachmentSize" INTEGER;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "attachmentPublicId" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "locationLabel" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "hiddenFor" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE IF NOT EXISTS "ChatStatus" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "emoji" TEXT,
    "color" TEXT NOT NULL DEFAULT 'violet',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ChatConversation_inviteCode_key" ON "ChatConversation"("inviteCode");
CREATE UNIQUE INDEX IF NOT EXISTS "ChatStatus_userId_key" ON "ChatStatus"("userId");
CREATE INDEX IF NOT EXISTS "ChatStatus_companyId_expiresAt_idx" ON "ChatStatus"("companyId", "expiresAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ChatStatus" ADD CONSTRAINT "ChatStatus_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatStatus" ADD CONSTRAINT "ChatStatus_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Existing group creators become owners so they can manage membership.
UPDATE "ChatParticipant" p
SET "role" = 'OWNER'
FROM "ChatConversation" c
WHERE p."conversationId" = c."id"
  AND c."createdById" = p."userId"
  AND c."type" = 'GROUP'
  AND p."role" = 'MEMBER';
