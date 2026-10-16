ALTER TABLE "CareerProfile"
  ADD COLUMN "citizenshipCountry" TEXT NOT NULL DEFAULT 'India',
  ADD COLUMN "includeInternationalRoles" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "UserNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "jobCount" INTEGER NOT NULL DEFAULT 0,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UserNotification"
  ADD CONSTRAINT "UserNotification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserNotification"
  ADD CONSTRAINT "UserNotification_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "CareerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "UserNotification_userId_createdAt_idx" ON "UserNotification"("userId", "createdAt");
CREATE INDEX "UserNotification_profileId_createdAt_idx" ON "UserNotification"("profileId", "createdAt");
CREATE INDEX "UserNotification_readAt_idx" ON "UserNotification"("readAt");
