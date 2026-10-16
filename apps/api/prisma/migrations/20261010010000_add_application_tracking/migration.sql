CREATE TYPE "ApplicationStage" AS ENUM ('APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN');

ALTER TABLE "UserJobState"
ADD COLUMN "applicationStage" "ApplicationStage",
ADD COLUMN "applicationNotes" TEXT,
ADD COLUMN "appliedAt" TIMESTAMP(3);

UPDATE "UserJobState"
SET "applicationStage" = 'APPLIED',
    "appliedAt" = COALESCE("appliedAt", "updatedAt")
WHERE "state" = 'APPLIED';
