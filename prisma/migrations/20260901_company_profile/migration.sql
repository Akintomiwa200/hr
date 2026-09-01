-- Company profile fields (real-time company identity: logo, contact, address)
ALTER TABLE "Company"
  ADD COLUMN "logo" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "address" TEXT;
