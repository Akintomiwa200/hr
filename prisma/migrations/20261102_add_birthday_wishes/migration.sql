-- CreateTable
CREATE TABLE "BirthdayWish" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "recipientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "birthdayOn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BirthdayWish_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BirthdayWish_recipientId_authorId_birthdayOn_key" ON "BirthdayWish"("recipientId", "authorId", "birthdayOn");

-- CreateIndex
CREATE INDEX "BirthdayWish_companyId_birthdayOn_idx" ON "BirthdayWish"("companyId", "birthdayOn");

-- CreateIndex
CREATE INDEX "BirthdayWish_recipientId_birthdayOn_idx" ON "BirthdayWish"("recipientId", "birthdayOn");

-- AddForeignKey
ALTER TABLE "BirthdayWish" ADD CONSTRAINT "BirthdayWish_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BirthdayWish" ADD CONSTRAINT "BirthdayWish_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BirthdayWish" ADD CONSTRAINT "BirthdayWish_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
