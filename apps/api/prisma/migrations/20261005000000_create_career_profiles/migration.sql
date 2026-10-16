CREATE TYPE "ProfileDomain" AS ENUM (
  'SOFTWARE',
  'DIGITAL_HARDWARE',
  'EMBEDDED',
  'DATA_ML',
  'RESEARCH'
);

CREATE TYPE "WorkMode" AS ENUM (
  'ONSITE',
  'HYBRID',
  'REMOTE',
  'UNKNOWN'
);

CREATE TYPE "EmploymentType" AS ENUM (
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'UNKNOWN'
);

CREATE TABLE "CareerProfile" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "domain" "ProfileDomain" NOT NULL,
  "graduationYear" INTEGER,
  "experienceMonths" INTEGER NOT NULL,
  "preferredRoles" TEXT[] NOT NULL,
  "preferredLocations" TEXT[] NOT NULL,
  "preferredWorkModes" "WorkMode"[] NOT NULL,
  "minimumSalary" INTEGER,
  "salaryCurrency" TEXT,
  "targetCompanies" TEXT[] NOT NULL,
  "excludedCompanies" TEXT[] NOT NULL,
  "includedKeywords" TEXT[] NOT NULL,
  "excludedKeywords" TEXT[] NOT NULL,
  "skills" TEXT[] NOT NULL,
  "seeksEmploymentTypes" "EmploymentType"[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CareerProfile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CareerProfile_domain_idx" ON "CareerProfile"("domain");
CREATE INDEX "CareerProfile_createdAt_idx" ON "CareerProfile"("createdAt");

