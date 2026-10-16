CREATE TYPE "ResumeExtractionStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED'
);

CREATE TABLE "Resume" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "extractionStatus" "ResumeExtractionStatus" NOT NULL DEFAULT 'PENDING',
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Resume_profileId_idx" ON "Resume"("profileId");
CREATE INDEX "Resume_isActive_idx" ON "Resume"("isActive");

ALTER TABLE "Resume"
ADD CONSTRAINT "Resume_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "CareerProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

