import { buildRecommendation, type CanonicalJob, type CareerProfile } from "@roleradar/domain";

import type { CompanyWatch } from "../company-watches/company-watch.types.js";
import type { JobRepository } from "../jobs/job.repository.js";
import type { CompanyWatchRepository } from "../company-watches/company-watch.repository.js";
import { normalizeRawJobPosting } from "../ingestion/job-normalizer.js";
import type { ProfileRepository } from "../profiles/profile.repository.js";
import { isStrictProfileMatch } from "../recommendations/recommendation.service.js";
import type { CareerPageFetcher } from "./career-page-fetcher.js";

export interface WatchCheckSummary {
  checked: number;
  skipped: number;
  created: number;
  updated: number;
  failed: number;
  filtered?: number;
  jobs: CanonicalJob[];
}

export class WatchCheckerService {
  constructor(
    private readonly companyWatchRepository: CompanyWatchRepository,
    private readonly jobRepository: JobRepository,
    private readonly careerPageFetcher: CareerPageFetcher,
    private readonly profileRepository?: ProfileRepository
  ) {}

  async checkDueWatches(now = new Date()): Promise<WatchCheckSummary> {
    const watches = await this.companyWatchRepository.findActive();
    return this.checkWatches(
      watches.filter((watch) => isDue(watch, now)),
      now,
      watches.filter((watch) => !isDue(watch, now)).length
    );
  }

  async checkProfileWatches(userId: string, profileId: string, now = new Date()): Promise<WatchCheckSummary> {
    const watches = await this.companyWatchRepository.findForProfile(userId, profileId);
    const profile = await this.getProfile(userId, profileId);
    return this.checkWatches(
      watches.filter((watch) => watch.isActive),
      now,
      0,
      profile
    );
  }

  async checkDueProfileWatches(userId: string, profileId: string, now = new Date()): Promise<WatchCheckSummary> {
    const watches = await this.companyWatchRepository.findForProfile(userId, profileId);
    const activeWatches = watches.filter((watch) => watch.isActive);
    return this.checkWatches(
      activeWatches.filter((watch) => isDue(watch, now)),
      now,
      activeWatches.filter((watch) => !isDue(watch, now)).length,
      await this.getProfile(userId, profileId)
    );
  }

  private async checkWatches(
    watches: CompanyWatch[],
    now: Date,
    skipped = 0,
    profile?: CareerProfile
  ): Promise<WatchCheckSummary> {
    const summary: WatchCheckSummary = {
      checked: 0,
      skipped,
      created: 0,
      updated: 0,
      failed: 0,
      filtered: 0,
      jobs: []
    };

    for (const watch of watches) {
      try {
        const rawJobs = await this.careerPageFetcher.fetchJobs(watch);
        for (const rawJob of rawJobs) {
          const normalizedJob = normalizeRawJobPosting(rawJob);
          if (profile !== undefined) {
            const candidate: CanonicalJob = { id: "candidate", ...normalizedJob, evidence: [] };
            if (buildRecommendation(candidate, profile).eligibility === "INELIGIBLE" || !isStrictProfileMatch(candidate, profile)) {
              summary.filtered = (summary.filtered ?? 0) + 1;
              continue;
            }
          }
          const result = await this.jobRepository.upsertBySourceUrl(normalizedJob);
          summary.jobs.push(result.job);
          if (result.created) {
            summary.created += 1;
          } else {
            summary.updated += 1;
          }
        }

        await this.companyWatchRepository.markChecked(watch.userId, watch.profileId, watch.id, now);
        summary.checked += 1;
      } catch (error) {
        summary.failed += 1;
        console.error(`Failed to check ${watch.companyName}:`, error);
      }
    }

    return summary;
  }

  private async getProfile(userId: string, profileId: string): Promise<CareerProfile | undefined> {
    if (this.profileRepository === undefined) return undefined;
    const profile = await this.profileRepository.findById(userId, profileId);
    return profile ?? undefined;
  }
}

function isDue(watch: CompanyWatch, now: Date): boolean {
  if (watch.lastCheckedAt === undefined) {
    return true;
  }

  const nextCheckAt = new Date(watch.lastCheckedAt.getTime() + watch.checkCadenceDays * 24 * 60 * 60 * 1000);
  return nextCheckAt <= now;
}
