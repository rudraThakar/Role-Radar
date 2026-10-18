import { buildRecommendation, type CanonicalJob, type CareerProfile } from "@roleradar/domain";

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

interface SourceDiscoveryOutcome {
  result: ProfileDiscoverySourceResult;
  created: number;
  updated: number;
  skippedIneligible: number;
  jobs: CanonicalJob[];
}

const sourceConcurrency = 4;

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

    for (let offset = 0; offset < selectedSources.length; offset += sourceConcurrency) {
      const sourceBatch = selectedSources.slice(offset, offset + sourceConcurrency);
      const outcomes = await Promise.all(
        sourceBatch.map((source) => this.discoverSource(userId, profileId, source, profile))
      );

      for (const outcome of outcomes) {
        summary.checked += 1;
        summary.created += outcome.created;
        summary.updated += outcome.updated;
        summary.skippedIneligible += outcome.skippedIneligible;
        summary.failed += outcome.result.failed ? 1 : 0;
        summary.jobs.push(...outcome.jobs);
        summary.sources.push(outcome.result);
      }
    }

    return summary;
  }

  private async discoverSource(
    userId: string,
    profileId: string,
    source: DiscoverySource,
    profile: CareerProfile
  ): Promise<SourceDiscoveryOutcome> {
      const sourceResult: ProfileDiscoverySourceResult = {
        sourceId: source.id,
        companyName: source.companyName,
        provider: source.provider,
        fetched: 0,
        stored: 0,
        skippedIneligible: 0,
        failed: false
      };
      const outcome: SourceDiscoveryOutcome = {
        result: sourceResult,
        created: 0,
        updated: 0,
        skippedIneligible: 0,
        jobs: []
      };

      try {
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
            outcome.skippedIneligible += 1;
            sourceResult.skippedIneligible += 1;
            continue;
          }

          const result = await this.jobRepository.upsertBySourceUrl(normalizedJob);
          if (result.created) {
            outcome.created += 1;
          } else {
            outcome.updated += 1;
          }

          sourceResult.stored += 1;
          outcome.jobs.push(result.job);
        }
      } catch (error) {
        sourceResult.failed = true;
        sourceResult.error = error instanceof Error ? error.message : "Unknown discovery error";
      }

      return outcome;
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
