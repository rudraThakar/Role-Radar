export const employmentTypes = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "UNKNOWN"
] as const;

export type EmploymentType = (typeof employmentTypes)[number];

export const seniorityLevels = [
  "FRESHER",
  "ENTRY_LEVEL",
  "MID_LEVEL",
  "SENIOR",
  "UNKNOWN"
] as const;

export type Seniority = (typeof seniorityLevels)[number];

export const workModes = ["ONSITE", "HYBRID", "REMOTE", "UNKNOWN"] as const;

export type WorkMode = (typeof workModes)[number];

export const profileDomains = [
  "SOFTWARE",
  "DIGITAL_HARDWARE",
  "EMBEDDED",
  "DATA_ML",
  "RESEARCH",
  "MECHANICAL",
  "CIVIL",
  "ELECTRICAL",
  "PRODUCT",
  "DESIGN",
  "MARKETING",
  "SALES",
  "FINANCE",
  "HUMAN_RESOURCES",
  "OPERATIONS",
  "CUSTOMER_SUPPORT",
  "GENERAL"
] as const;

export type ProfileDomain = (typeof profileDomains)[number];

export const companyStages = ["STARTUP", "ESTABLISHED"] as const;

export type CompanyStage = (typeof companyStages)[number];

export interface Evidence {
  field: string;
  value: string | number | boolean;
  snippet?: string;
  confidence: number;
}

export interface CanonicalJob {
  id: string;
  companyName: string;
  companyStage?: CompanyStage;
  title: string;
  normalizedTitle: string;
  description: string;
  employmentType: EmploymentType;
  seniority: Seniority;
  domains: ProfileDomain[];
  skills: string[];
  minimumExperienceMonths?: number;
  maximumExperienceMonths?: number;
  eligibleGraduationYears?: number[];
  locations: string[];
  workMode: WorkMode;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  sourceUrl: string;
  applyUrl: string;
  publishedAt?: Date;
  discoveredAt: Date;
  expiresAt?: Date;
  evidence: Evidence[];
}
