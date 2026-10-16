CREATE TYPE "Seniority" AS ENUM (
  'FRESHER',
  'ENTRY_LEVEL',
  'MID_LEVEL',
  'SENIOR',
  'UNKNOWN'
);

CREATE TABLE "Job" (
  "id" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "normalizedTitle" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "employmentType" "EmploymentType" NOT NULL,
  "seniority" "Seniority" NOT NULL,
  "domains" "ProfileDomain"[] NOT NULL,
  "skills" TEXT[] NOT NULL,
  "minimumExperienceMonths" INTEGER,
  "maximumExperienceMonths" INTEGER,
  "eligibleGraduationYears" INTEGER[] NOT NULL,
  "locations" TEXT[] NOT NULL,
  "workMode" "WorkMode" NOT NULL,
  "salaryMin" INTEGER,
  "salaryMax" INTEGER,
  "salaryCurrency" TEXT,
  "sourceUrl" TEXT NOT NULL,
  "applyUrl" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Job_companyName_idx" ON "Job"("companyName");
CREATE INDEX "Job_discoveredAt_idx" ON "Job"("discoveredAt");
CREATE INDEX "Job_employmentType_idx" ON "Job"("employmentType");
CREATE INDEX "Job_seniority_idx" ON "Job"("seniority");
CREATE INDEX "Job_workMode_idx" ON "Job"("workMode");

