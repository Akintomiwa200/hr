ALTER TABLE "Document"
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "publicId" TEXT,
ADD COLUMN "storageType" TEXT;

ALTER TABLE "Document"
ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PRIVATE';

ALTER TABLE "Document"
ADD COLUMN "uploadedById" TEXT,
ADD COLUMN "protectionHash" TEXT;
