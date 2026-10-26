CREATE TABLE "JobDiscoverySource" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "careersUrl" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "domains" "ProfileDomain"[],
    "locations" TEXT[],
    "roleKeywords" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "lastError" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobDiscoverySource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobDiscoveryRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "normalized" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobDiscoveryRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobDiscoverySource_careersUrl_key" ON "JobDiscoverySource"("careersUrl");
CREATE INDEX "JobDiscoverySource_isActive_idx" ON "JobDiscoverySource"("isActive");
CREATE INDEX "JobDiscoverySource_provider_idx" ON "JobDiscoverySource"("provider");
CREATE INDEX "JobDiscoverySource_lastCheckedAt_idx" ON "JobDiscoverySource"("lastCheckedAt");
CREATE INDEX "JobDiscoveryRun_sourceId_startedAt_idx" ON "JobDiscoveryRun"("sourceId", "startedAt");
CREATE INDEX "JobDiscoveryRun_status_startedAt_idx" ON "JobDiscoveryRun"("status", "startedAt");

ALTER TABLE "JobDiscoveryRun" ADD CONSTRAINT "JobDiscoveryRun_sourceId_fkey"
FOREIGN KEY ("sourceId") REFERENCES "JobDiscoverySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
