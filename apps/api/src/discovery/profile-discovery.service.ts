import { buildRecommendation, type CanonicalJob } from "@roleradar/domain";

import type { CompanyWatch } from "../company-watches/company-watch.types.js";
import { normalizeRawJobPosting } from "../ingestion/job-normalizer.js";
import type { JobRepository } from "../jobs/job.repository.js";
import type { ProfileRepository } from "../profiles/profile.repository.js";
import { isStrictProfileMatch } from "../recommendations/recommendation.service.js";
import { HttpError } from "../shared/http-error.js";
import type { CareerPageFetcher } from "../watch-checker/career-page-fetcher.js";
import {
  defaultDiscoverySources,
  selectDiscoverySources,
  type DiscoverySource
} from "./source-registry.js";

export interface ProfileDiscoverySummary {
  checked: number;
  skippedSources: number;
  created: number;
  updated: number;
  skippedIneligible: number;
  failed: number;
  jobs: CanonicalJob[];
  sources: ProfileDiscoverySourceResult[];
}

export interface ProfileDiscoverySourceResult {
  sourceId: string;
  companyName: string;
  provider: string;
  fetched: number;
  stored: number;
  skippedIneligible: number;
  failed: boolean;
  error?: string;
}

export class ProfileDiscoveryService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly jobRepository: JobRepository,
    private readonly careerPageFetcher: CareerPageFetcher,
    private readonly sources: DiscoverySource[] = defaultDiscoverySources
  ) {}

  async discoverForProfile(userId: string, profileId: string): Promise<ProfileDiscoverySummary> {
    const profile = await this.profileRepository.findById(userId, profileId);
    if (profile === null) {
      throw new HttpError(404, "Profile not found");
    }

    const selectedSources = selectDiscoverySources(profile, this.sources);
    const summary: ProfileDiscoverySummary = {
      checked: 0,
      skippedSources: this.sources.length - selectedSources.length,
      created: 0,
      updated: 0,
      skippedIneligible: 0,
      failed: 0,
      jobs: [],
      sources: []
    };

    for (const source of selectedSources) {
      const sourceResult: ProfileDiscoverySourceResult = {
        sourceId: source.id,
        companyName: source.companyName,
        provider: source.provider,
        fetched: 0,
        stored: 0,
        skippedIneligible: 0,
        failed: false
      };

      try {
        summary.checked += 1;
        const rawJobs = await this.careerPageFetcher.fetchJobs(toCompanyWatch(userId, profileId, source));
        sourceResult.fetched = rawJobs.length;

        for (const rawJob of rawJobs) {
          const normalizedJob = normalizeRawJobPosting(rawJob);
          const candidateJob: CanonicalJob = {
            id: "candidate",
            ...normalizedJob,
            evidence: []
          };
          const recommendation = buildRecommendation(candidateJob, profile);

          if (recommendation.eligibility === "INELIGIBLE" || !isStrictProfileMatch(candidateJob, profile)) {
            summary.skippedIneligible += 1;
            sourceResult.skippedIneligible += 1;
            continue;
          }

          const result = await this.jobRepository.upsertBySourceUrl(normalizedJob);
          if (result.created) {
            summary.created += 1;
          } else {
            summary.updated += 1;
          }

          sourceResult.stored += 1;
          summary.jobs.push(result.job);
        }
      } catch (error) {
        summary.failed += 1;
        sourceResult.failed = true;
        sourceResult.error = error instanceof Error ? error.message : "Unknown discovery error";
      }

      summary.sources.push(sourceResult);
    }

    return summary;
  }
}

function toCompanyWatch(userId: string, profileId: string, source: DiscoverySource): CompanyWatch {
  return {
    id: source.id,
    userId,
    profileId,
    companyName: source.companyName,
    careersUrl: source.careersUrl,
    checkCadenceDays: 1,
    isActive: true,
    createdAt: new Date()
  };
}
