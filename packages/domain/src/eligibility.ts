import type { CanonicalJob } from "./job.js";
import type { CareerProfile } from "./profile.js";
import type { Eligibility } from "./recommendation.js";
import { countMatches, hasAnyTextMatch, normalizeText } from "./text.js";

export interface EligibilityResult {
  eligibility: Eligibility;
  reasons: string[];
  gaps: string[];
  evidence: Record<string, unknown>;
}

export function evaluateEligibility(job: CanonicalJob, profile: CareerProfile): EligibilityResult {
  const reasons: string[] = [];
  const gaps: string[] = [];
  const evidence: Record<string, unknown> = {};

  if (profile.excludedCompanies.map(normalizeText).includes(normalizeText(job.companyName))) {
    return ineligible("Company is excluded by this profile", { companyName: job.companyName });
  }

  const jobText = `${job.title} ${job.description}`;
  if (hasAnyTextMatch(jobText, profile.excludedKeywords)) {
    return ineligible("Job contains an excluded keyword", { excludedKeywords: profile.excludedKeywords });
  }

  if (job.minimumExperienceMonths !== undefined && job.minimumExperienceMonths > profile.experienceMonths) {
    return ineligible("Required experience is greater than this profile's experience", {
      requiredExperienceMonths: job.minimumExperienceMonths,
      profileExperienceMonths: profile.experienceMonths
    });
  }

  if (job.seniority === "SENIOR" && profile.experienceMonths < 24) {
    return ineligible("Role title indicates a senior-level position", {
      jobSeniority: job.seniority,
      profileExperienceMonths: profile.experienceMonths
    });
  }

  if (job.minimumExperienceMonths !== undefined) {
    reasons.push(`Experience requirement (${formatExperience(job.minimumExperienceMonths)}) fits this profile`);
  }

  if (
    job.eligibleGraduationYears !== undefined &&
    profile.graduationYear !== undefined &&
    !job.eligibleGraduationYears.includes(profile.graduationYear)
  ) {
    return ineligible("Profile graduation year is not listed as eligible", {
      eligibleGraduationYears: job.eligibleGraduationYears,
      profileGraduationYear: profile.graduationYear
    });
  }

  if (
    job.employmentType !== "UNKNOWN" &&
    profile.seeksEmploymentTypes.length > 0 &&
    !profile.seeksEmploymentTypes.includes(job.employmentType)
  ) {
    return ineligible("Employment type does not match this profile", {
      jobEmploymentType: job.employmentType,
      profileEmploymentTypes: profile.seeksEmploymentTypes
    });
  }

  if (
    job.workMode !== "UNKNOWN" &&
    profile.preferredWorkModes.length > 0 &&
    !profile.preferredWorkModes.includes(job.workMode)
  ) {
    return ineligible("Work mode does not match this profile", {
      jobWorkMode: job.workMode,
      profileWorkModes: profile.preferredWorkModes
    });
  }

  if (!profile.includeInternationalRoles && isInternationalOnlyJob(job.locations, profile.citizenshipCountry ?? "India")) {
    return ineligible("Job is outside this profile's default work-authorization country", {
      jobLocations: job.locations,
      citizenshipCountry: profile.citizenshipCountry ?? "India"
    });
  }

  if (job.salaryMin !== undefined && profile.minimumSalary !== undefined && job.salaryMin < profile.minimumSalary) {
    return ineligible("Known salary is below this profile's minimum", {
      jobSalaryMin: job.salaryMin,
      profileMinimumSalary: profile.minimumSalary
    });
  }

  if (job.domains.includes(profile.domain)) {
    reasons.push(`Job domain matches ${profile.domain}`);
  } else if (job.domains.length > 0) {
    gaps.push(`Job is classified as ${job.domains.join(", ")}, not ${profile.domain}`);
  }

  const matchingSkills = countMatches(profile.skills, job.skills);
  evidence.matchingSkills = matchingSkills;
  if (matchingSkills > 0) {
    reasons.push(`${matchingSkills} required skill(s) match this profile`);
  } else if (job.skills.length > 0) {
    gaps.push("No extracted job skills match this profile yet");
  }

  const locationMatches = countLocationMatches(profile.preferredLocations, job.locations);
  evidence.locationMatches = locationMatches;
  if (job.workMode === "REMOTE" || locationMatches > 0) {
    reasons.push("Location or remote preference matches");
  } else if (profile.preferredLocations.length > 0 && job.locations.length > 0) {
    return ineligible("Job location is outside this profile's preferred locations", {
      jobLocations: job.locations,
      preferredLocations: profile.preferredLocations
    });
  }

  if (job.minimumExperienceMonths === 0 || job.seniority === "FRESHER" || job.seniority === "ENTRY_LEVEL") {
    reasons.push("Role appears suitable for fresher or entry-level candidates");
  }

  if (reasons.length === 0 && gaps.length === 0) {
    return {
      eligibility: "UNKNOWN",
      reasons: ["Not enough reliable information to decide eligibility"],
      gaps,
      evidence
    };
  }

  return {
    eligibility: gaps.length > 0 ? "POSSIBLY_ELIGIBLE" : "ELIGIBLE",
    reasons,
    gaps,
    evidence
  };
}

function countLocationMatches(preferredLocations: string[], jobLocations: string[]): number {
  let matches = 0;

  for (const jobLocation of jobLocations) {
    const normalizedJobLocation = normalizeText(jobLocation);
    const matched = preferredLocations.some((preferredLocation) => {
      const normalizedPreferredLocation = normalizeText(preferredLocation);
      const preferredCountry = detectCountry(preferredLocation);
      const jobCountry = detectCountry(jobLocation);
      return (
        normalizedJobLocation === normalizedPreferredLocation ||
        normalizedJobLocation.includes(normalizedPreferredLocation) ||
        normalizedPreferredLocation.includes(normalizedJobLocation) ||
        (preferredCountry !== undefined && preferredCountry === jobCountry)
      );
    });

    if (matched) {
      matches += 1;
    }
  }

  return matches;
}

function isInternationalOnlyJob(jobLocations: string[], citizenshipCountry: string): boolean {
  if (jobLocations.length === 0) {
    return false;
  }

  const normalizedCitizenship = normalizeCountry(citizenshipCountry);
  const detectedCountries = jobLocations.map(detectCountry).filter((country): country is string => country !== undefined);

  return detectedCountries.length > 0 && detectedCountries.every((country) => country !== normalizedCitizenship);
}

function detectCountry(location: string): string | undefined {
  const normalizedLocation = normalizeText(location);
  if (/\b(india|bengaluru|bangalore|hyderabad|pune|chennai|gurugram|noida|mumbai|ahmedabad|kochi|kolkata|jaipur)\b/.test(normalizedLocation)) {
    return "india";
  }
  if (isUnitedStatesLocation(location, normalizedLocation)) {
    return "united states";
  }
  if (/\b(canada|toronto|vancouver|ontario)\b/.test(normalizedLocation)) return "canada";
  if (/\b(united kingdom|uk|london|england)\b/.test(normalizedLocation)) return "united kingdom";
  if (/\b(germany|berlin|munich)\b/.test(normalizedLocation)) return "germany";
  if (/\b(hungary|budapest)\b/.test(normalizedLocation)) return "hungary";
  if (/\b(pol[a-z]*|warsaw|krakow)\b/.test(normalizedLocation)) return "poland";
  if (/\b(israel|tel aviv|haifa)\b/.test(normalizedLocation)) return "israel";
  if (/\b(netherlands|amsterdam|eindhoven)\b/.test(normalizedLocation)) return "netherlands";
  if (/\b(ireland|dublin|cork)\b/.test(normalizedLocation)) return "ireland";
  if (/\b(france|paris|grenoble)\b/.test(normalizedLocation)) return "france";
  if (/\b(singapore)\b/.test(normalizedLocation)) return "singapore";
  if (/\b(taiwan|hsinchu|taipei)\b/.test(normalizedLocation)) return "taiwan";
  if (/\b(china|shanghai|beijing|shenzhen)\b/.test(normalizedLocation)) return "china";
  if (/\b(south korea|korea|seoul)\b/.test(normalizedLocation)) return "south korea";
  return undefined;
}

function isUnitedStatesLocation(location: string, normalizedLocation: string): boolean {
  if (
    /\b(usa|u s a|united states|us ca|us ny|us wa|california|new york|texas|massachusetts|washington state|illinois|virginia|north carolina|south carolina|colorado|georgia|florida|new jersey|pennsylvania|oregon|michigan|minnesota|arizona)\b/.test(
      normalizedLocation
    )
  ) {
    return true;
  }

  if (/\b(san francisco|santa clara|san jose|seattle|austin|boston|new york city|chicago|raleigh|mountain view|palo alto|portland|denver|atlanta)\b/.test(normalizedLocation)) {
    return true;
  }

  return /(?:^|,\s*)(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|IA|KS|KY|LA|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)(?:\s|$)/i.test(
    location.trim()
  );
}

function normalizeCountry(country: string): string {
  const normalized = normalizeText(country);
  if (normalized === "usa" || normalized === "us") return "united states";
  if (normalized === "uk") return "united kingdom";
  return normalized;
}

function ineligible(reason: string, evidence: Record<string, unknown>): EligibilityResult {
  return {
    eligibility: "INELIGIBLE",
    reasons: [],
    gaps: [reason],
    evidence
  };
}

function formatExperience(months: number): string {
  if (months === 0) return "no prior experience";
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${months} months`;
}
