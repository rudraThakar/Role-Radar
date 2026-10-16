import {
  buildRecommendation,
  normalizeText,
  tokenOverlapScore,
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

    const jobs = await this.jobRepository.findAll();
    const stateByJobId = new Map(
      (await this.jobStateRepository.findForProfile(userId, profileId)).map((jobState) => [jobState.jobId, jobState.state])
    );

    return jobs
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
      .sort((left, right) => right.score - left.score);
  }
}

export function isStrictProfileMatch(job: CanonicalJob, profile: CareerProfile): boolean {
  if (!job.domains.includes(profile.domain)) {
    return false;
  }

  if (profile.preferredRoles.length === 0) {
    return true;
  }

  const jobRoleText = normalizeText(`${job.title} ${job.normalizedTitle}`);
  return profile.preferredRoles.some((role) => {
    const normalizedRole = normalizeText(role);
    return jobRoleText.includes(normalizedRole) || tokenOverlapScore(jobRoleText, normalizedRole) >= 0.35;
  });
}
