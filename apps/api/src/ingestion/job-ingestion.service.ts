import type { CanonicalJob } from "@roleradar/domain";

import type { JobRepository } from "../jobs/job.repository.js";
import type { ProfileRepository } from "../profiles/profile.repository.js";
import { HttpError } from "../shared/http-error.js";
import type { ImportJobsInput } from "./ingestion.dto.js";
import { normalizeRawJobPosting } from "./job-normalizer.js";

export interface JobIngestionResult {
  created: number;
  updated: number;
  jobs: CanonicalJob[];
}

export class JobIngestionService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly jobRepository: JobRepository
  ) {}

  async importJobsForProfile(userId: string, profileId: string, input: ImportJobsInput): Promise<JobIngestionResult> {
    const profile = await this.profileRepository.findById(userId, profileId);
    if (profile === null) {
      throw new HttpError(404, "Profile not found");
    }

    const jobs: CanonicalJob[] = [];
    let created = 0;
    let updated = 0;

    for (const rawJob of input.jobs) {
      const normalizedJob = normalizeRawJobPosting(rawJob);
      const result = await this.jobRepository.upsertBySourceUrl(normalizedJob);
      jobs.push(result.job);

      if (result.created) {
        created += 1;
      } else {
        updated += 1;
      }
    }

    return { created, updated, jobs };
  }
}
