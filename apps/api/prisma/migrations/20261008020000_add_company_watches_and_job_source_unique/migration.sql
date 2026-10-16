CREATE TABLE "CompanyWatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "careersUrl" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "checkCadenceDays" INTEGER NOT NULL DEFAULT 1,
    "lastCheckedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyWatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Job_sourceUrl_key" ON "Job"("sourceUrl");
CREATE UNIQUE INDEX "CompanyWatch_userId_profileId_careersUrl_key" ON "CompanyWatch"("userId", "profileId", "careersUrl");
CREATE INDEX "CompanyWatch_userId_profileId_idx" ON "CompanyWatch"("userId", "profileId");
CREATE INDEX "CompanyWatch_isActive_idx" ON "CompanyWatch"("isActive");
CREATE INDEX "CompanyWatch_lastCheckedAt_idx" ON "CompanyWatch"("lastCheckedAt");

ALTER TABLE "CompanyWatch" ADD CONSTRAINT "CompanyWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyWatch" ADD CONSTRAINT "CompanyWatch_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CareerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
