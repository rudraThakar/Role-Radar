import {
  buildRecommendation,
  normalizeText,
  roleTitleMatchScore,
  type CanonicalJob,
  type CareerProfile,
  type RecommendationExplanation
} from "@roleradar/domain";

import type { JobRepository } from "../jobs/job.repository.js";
import type { JobStateRepository } from "../job-states/job-state.repository.js";
import type { JobStateValue } from "../job-states/job-state.types.js";
import type { ProfileRepository } from "../profiles/profile.repository.js";
import { HttpError } from "../shared/http-error.js";

export interface JobRecommendation extends RecommendationExplanation {
  job: CanonicalJob;
  state?: JobStateValue;
}

export class RecommendationService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly jobRepository: JobRepository,
    private readonly jobStateRepository: JobStateRepository
  ) {}

  async listRecommendations(userId: string, profileId: string): Promise<JobRecommendation[]> {
    const profile = await this.profileRepository.findById(userId, profileId);
    if (profile === null) {
      throw new HttpError(404, "Profile not found");
    }

    const jobs =
      profile.domain === "GENERAL"
        ? await this.jobRepository.findAll()
        : await this.jobRepository.findByDomain(profile.domain);
    const stateByJobId = new Map(
      (await this.jobStateRepository.findForProfile(userId, profileId)).map((jobState) => [jobState.jobId, jobState.state])
    );

    const ranked = jobs
      .map((job) => {
        const recommendation: JobRecommendation = {
          job,
          ...buildRecommendation(job, profile)
        };

        const state = stateByJobId.get(job.id);
        if (state !== undefined) {
          recommendation.state = state;
        }

        return recommendation;
      })
      .filter((recommendation) => recommendation.eligibility !== "INELIGIBLE")
      .filter((recommendation) => isStrictProfileMatch(recommendation.job, profile))
      .filter((recommendation) => recommendation.state !== "HIDDEN")
      .sort((left, right) => right.score - left.score)
      // The feed only previews descriptions; full text made responses multi-MB.
      .map((recommendation) => ({
        ...recommendation,
        job: { ...recommendation.job, description: previewDescription(recommendation.job.description) }
      }));

    return diversifyByCompany(ranked);
  }
}

export function isStrictProfileMatch(job: CanonicalJob, profile: CareerProfile): boolean {
  // "General" profiles are defined purely by their target roles.
  if (profile.domain !== "GENERAL" && !job.domains.includes(profile.domain)) {
    return false;
  }

  if (profile.preferredRoles.length === 0) {
    return profile.domain !== "GENERAL";
  }

  const jobRoleText = normalizeText(`${job.title} ${job.normalizedTitle}`);
  return profile.preferredRoles.some((role) => {
    const normalizedRole = normalizeText(role);
    return jobRoleText.includes(normalizedRole) || roleTitleMatchScore(jobRoleText, normalizedRole) >= 0.5;
  });
}

function previewDescription(description: string): string {
  const normalized = description.replace(/\s+/g, " ").trim();
  return normalized.length <= 600 ? normalized : `${normalized.slice(0, 597).trimEnd()}...`;
}

const startupLocationBoost = 6;
const repeatCompanyPenalty = 5;

// Keeps one employer from filling the first page: each additional job from the
// same company is ranked a little lower, and startups in the user's preferred
// location get a boost. The reported score itself is not altered.
export function diversifyByCompany(recommendations: JobRecommendation[]): JobRecommendation[] {
  const seenPerCompany = new Map<string, number>();

  return recommendations
    .map((recommendation) => {
      const company = normalizeText(recommendation.job.companyName);
      const position = seenPerCompany.get(company) ?? 0;
      seenPerCompany.set(company, position + 1);

      const locationMatches = Number(recommendation.evidence.locationMatches ?? 0);
      const boost = recommendation.job.companyStage === "STARTUP" && locationMatches > 0 ? startupLocationBoost : 0;
      return { recommendation, rank: recommendation.score + boost - position * repeatCompanyPenalty };
    })
    .sort((left, right) => right.rank - left.rank || right.recommendation.score - left.recommendation.score)
    .map(({ recommendation }) => recommendation);
}
