ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_pinnedAt_idx"
  ON "ChatMessage"("conversationId", "pinnedAt");
