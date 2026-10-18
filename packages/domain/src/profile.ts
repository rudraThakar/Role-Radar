import type { EmploymentType, ProfileDomain, WorkMode } from "./job.js";

export interface CareerProfile {
  id: string;
  name: string;
  domain: ProfileDomain;
  graduationYear?: number;
  experienceMonths: number;
  preferredRoles: string[];
  preferredLocations: string[];
  preferredWorkModes: WorkMode[];
  citizenshipCountry?: string;
  includeInternationalRoles?: boolean;
  minimumSalary?: number;
  salaryCurrency?: string;
  targetCompanies: string[];
  excludedCompanies: string[];
  includedKeywords: string[];
  excludedKeywords: string[];
  skills: string[];
  seeksEmploymentTypes: EmploymentType[];
}
