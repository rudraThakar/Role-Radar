CREATE TYPE "JobState" AS ENUM (
  'SAVED',
  'HIDDEN',
  'VIEWED',
  'APPLIED'
);

CREATE TABLE "UserJobState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "state" "JobState" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserJobState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserJobState_userId_profileId_jobId_key" ON "UserJobState"("userId", "profileId", "jobId");
CREATE INDEX "UserJobState_userId_profileId_idx" ON "UserJobState"("userId", "profileId");
CREATE INDEX "UserJobState_jobId_idx" ON "UserJobState"("jobId");
CREATE INDEX "UserJobState_state_idx" ON "UserJobState"("state");

ALTER TABLE "UserJobState"
ADD CONSTRAINT "UserJobState_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserJobState"
ADD CONSTRAINT "UserJobState_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "CareerProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserJobState"
ADD CONSTRAINT "UserJobState_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "Job"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

