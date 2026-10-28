-- Account lifecycle controls for platform-managed users.
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "User_isActive_idx" ON "User"("isActive");
CREATE INDEX "User_archivedAt_idx" ON "User"("archivedAt");
