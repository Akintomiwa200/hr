-- Per-user read receipts for derived ("computed") notifications such as
-- pending leave approvals, announcements, attendance and appraisal reminders.
CREATE TABLE "NotificationRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationRead_userId_key_key" ON "NotificationRead"("userId", "key");
CREATE INDEX "NotificationRead_userId_readAt_idx" ON "NotificationRead"("userId", "readAt");

ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
