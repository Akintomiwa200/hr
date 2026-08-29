-- CreateTable
CREATE TABLE "OffboardingSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OffboardingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OffboardingSettings_companyId_key" ON "OffboardingSettings"("companyId");

-- AddForeignKey
ALTER TABLE "OffboardingSettings" ADD CONSTRAINT "OffboardingSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
