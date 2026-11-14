DROP INDEX IF EXISTS "ChatStatus_userId_key";

ALTER TABLE "ChatStatus"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'TEXT',
  ADD COLUMN "mediaUrl" TEXT,
  ADD COLUMN "mediaName" TEXT,
  ADD COLUMN "mediaMime" TEXT,
  ADD COLUMN "mediaSize" INTEGER,
  ADD COLUMN "mediaPublicId" TEXT,
  ADD COLUMN "font" TEXT NOT NULL DEFAULT 'sans',
  ADD COLUMN "audienceMode" TEXT NOT NULL DEFAULT 'ALL',
  ADD COLUMN "audienceUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "repostedFromId" TEXT;

ALTER TABLE "ChatMessage" ADD COLUMN "statusReplyToId" TEXT;
CREATE INDEX "ChatMessage_statusReplyToId_idx" ON "ChatMessage"("statusReplyToId");

CREATE INDEX "ChatStatus_companyId_expiresAt_createdAt_idx" ON "ChatStatus"("companyId", "expiresAt", "createdAt");
CREATE INDEX "ChatStatus_userId_createdAt_idx" ON "ChatStatus"("userId", "createdAt");

CREATE TABLE "ChatStatusView" (
  "id" TEXT NOT NULL,
  "statusId" TEXT NOT NULL,
  "viewerId" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatStatusView_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChatStatusView_statusId_viewerId_key" ON "ChatStatusView"("statusId", "viewerId");
CREATE INDEX "ChatStatusView_statusId_viewedAt_idx" ON "ChatStatusView"("statusId", "viewedAt");
CREATE TABLE "ChatStatusReaction" (
  "id" TEXT NOT NULL,
  "statusId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatStatusReaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChatStatusReaction_statusId_userId_emoji_key" ON "ChatStatusReaction"("statusId", "userId", "emoji");
CREATE INDEX "ChatStatusReaction_statusId_createdAt_idx" ON "ChatStatusReaction"("statusId", "createdAt");

ALTER TABLE "ChatStatusView" ADD CONSTRAINT "ChatStatusView_statusId_fkey"
FOREIGN KEY ("statusId") REFERENCES "ChatStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatStatusView" ADD CONSTRAINT "ChatStatusView_viewerId_fkey"
FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatStatusReaction" ADD CONSTRAINT "ChatStatusReaction_statusId_fkey"
FOREIGN KEY ("statusId") REFERENCES "ChatStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatStatusReaction" ADD CONSTRAINT "ChatStatusReaction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_statusReplyToId_fkey"
FOREIGN KEY ("statusReplyToId") REFERENCES "ChatStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatStatus" ADD CONSTRAINT "ChatStatus_repostedFromId_fkey"
FOREIGN KEY ("repostedFromId") REFERENCES "ChatStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
