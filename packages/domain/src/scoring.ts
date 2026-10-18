import type { CanonicalJob } from "./job.js";
import type { CareerProfile } from "./profile.js";
import type { RecommendationExplanation } from "./recommendation.js";
import { evaluateEligibility } from "./eligibility.js";
import { roleTitleMatchScore } from "./role-matching.js";
import { countMatches, normalizeText } from "./text.js";

export const defaultScoreVersion = "deterministic-v1";

export interface ScoreWeights {
  roleTitleSimilarity: number;
  skillCoverage: number;
  experienceAndGraduationFit: number;
  locationWorkModeFit: number;
  targetCompanyPreference: number;
  salaryPreference: number;
  freshness: number;
}

export const defaultScoreWeights: ScoreWeights = {
  roleTitleSimilarity: 30,
  skillCoverage: 25,
  experienceAndGraduationFit: 15,
  locationWorkModeFit: 10,
  targetCompanyPreference: 10,
  salaryPreference: 5,
  freshness: 5
};

export function buildRecommendation(
  job: CanonicalJob,
  profile: CareerProfile,
  now: Date = new Date(),
  weights: ScoreWeights = defaultScoreWeights
): RecommendationExplanation {
  const eligibility = evaluateEligibility(job, profile);

  if (eligibility.eligibility === "INELIGIBLE") {
    return {
      eligibility: "INELIGIBLE",
      score: 0,
      scoreVersion: defaultScoreVersion,
      reasons: eligibility.reasons,
      gaps: eligibility.gaps,
      evidence: eligibility.evidence
    };
  }

  const roleScore = bestRoleScore(job, profile);
  const skillScore = job.skills.length === 0 ? 0.5 : countMatches(profile.skills, job.skills) / job.skills.length;
  const experienceScore = experienceAndGraduationScore(job, profile);
  const locationScore = locationWorkModeScore(job, profile);
  const companyScore = targetCompanyScore(job, profile);
  const salaryScore = salaryPreferenceScore(job, profile);
  const freshnessScoreValue = freshnessScore(job, now);

  const score =
    roleScore * weights.roleTitleSimilarity +
    skillScore * weights.skillCoverage +
    experienceScore * weights.experienceAndGraduationFit +
    locationScore * weights.locationWorkModeFit +
    companyScore * weights.targetCompanyPreference +
    salaryScore * weights.salaryPreference +
    freshnessScoreValue * weights.freshness;

  return {
    eligibility: eligibility.eligibility,
    score: Math.round(score),
    scoreVersion: defaultScoreVersion,
    reasons: eligibility.reasons,
    gaps: eligibility.gaps,
    evidence: {
      ...eligibility.evidence,
      roleScore,
      skillScore,
      experienceScore,
      locationScore,
      companyScore,
      salaryScore,
      freshnessScore: freshnessScoreValue
    }
  };
}

function bestRoleScore(job: CanonicalJob, profile: CareerProfile): number {
  if (profile.preferredRoles.length === 0) {
    return 0.5;
  }

  return Math.max(...profile.preferredRoles.map((role) => roleTitleMatchScore(job.normalizedTitle, role)));
}

function experienceAndGraduationScore(job: CanonicalJob, profile: CareerProfile): number {
  const experienceFits =
    job.minimumExperienceMonths === undefined || job.minimumExperienceMonths <= profile.experienceMonths;
  const graduationFits =
    job.eligibleGraduationYears === undefined ||
    profile.graduationYear === undefined ||
    job.eligibleGraduationYears.includes(profile.graduationYear);

  if (experienceFits && graduationFits) {
    return 1;
  }

  if (experienceFits || graduationFits) {
    return 0.5;
  }

  return 0;
}

function locationWorkModeScore(job: CanonicalJob, profile: CareerProfile): number {
  if (job.workMode === "REMOTE" && profile.preferredWorkModes.includes("REMOTE")) {
    return 1;
  }

  const workModeFits = job.workMode === "UNKNOWN" || profile.preferredWorkModes.includes(job.workMode);
  const locationFits =
    profile.preferredLocations.length === 0 || countMatches(profile.preferredLocations, job.locations) > 0;

  if (workModeFits && locationFits) {
    return 1;
  }

  if (workModeFits || locationFits) {
    return 0.5;
  }

  return 0;
}

function targetCompanyScore(job: CanonicalJob, profile: CareerProfile): number {
  if (profile.targetCompanies.length === 0) {
    return 0.5;
  }

  return profile.targetCompanies.map(normalizeText).includes(normalizeText(job.companyName)) ? 1 : 0;
}

function salaryPreferenceScore(job: CanonicalJob, profile: CareerProfile): number {
  if (profile.minimumSalary === undefined || job.salaryMin === undefined) {
    return 0.5;
  }

  return job.salaryMin >= profile.minimumSalary ? 1 : 0;
}

function freshnessScore(job: CanonicalJob, now: Date): number {
  const ageMs = now.getTime() - job.discoveredAt.getTime();
  const ageDays = Math.max(0, ageMs / 86_400_000);

  if (ageDays <= 1) {
    return 1;
  }

  if (ageDays >= 30) {
    return 0;
  }

  return 1 - ageDays / 30;
}
