import { buildRecommendation, type CanonicalJob, type CareerProfile } from "@roleradar/domain";

import type { CompanyWatch } from "../company-watches/company-watch.types.js";
import { normalizeRawJobPosting } from "../ingestion/job-normalizer.js";
import type { JobRepository } from "../jobs/job.repository.js";
import type { ProfileRepository } from "../profiles/profile.repository.js";
import { isStrictProfileMatch } from "../recommendations/recommendation.service.js";
import { HttpError } from "../shared/http-error.js";
import type { CareerPageFetcher } from "../watch-checker/career-page-fetcher.js";
import type { DiscoverySourceRepository } from "./discovery-source.repository.js";
import { defaultDiscoverySources, type DiscoverySource } from "./source-registry.js";

export interface ProfileDiscoverySummary {
  checked: number;
  skippedSources: number;
  created: number;
  updated: number;
  skippedIneligible: number;
  failed: number;
  globallyCreated: number;
  globallyUpdated: number;
  jobs: CanonicalJob[];
  sources: ProfileDiscoverySourceResult[];
}

export interface ProfileDiscoverySourceResult {
  sourceId: string;
  companyName: string;
  provider: string;
  fetched: number;
  normalized: number;
  stored: number;
  created: number;
  updated: number;
  skippedIneligible: number;
  failed: boolean;
  failedPostings: number;
  error?: string;
}

interface DiscoveredJob {
  job: CanonicalJob;
  created: boolean;
}

interface SourceDiscoveryOutcome {
  result: ProfileDiscoverySourceResult;
  jobs: DiscoveredJob[];
}

export interface GlobalDiscoverySummary {
  checked: number;
  created: number;
  updated: number;
  failed: number;
  jobs: DiscoveredJob[];
  sources: ProfileDiscoverySourceResult[];
}

// Render's free instance has a small memory budget. ATS responses can contain
// hundreds of full job descriptions, so only a few boards run at once and
// nothing but counters is retained between postings.
const sourceConcurrency = 2;

export class ProfileDiscoveryService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly jobRepository: JobRepository,
    private readonly careerPageFetcher: CareerPageFetcher,
    private readonly sourceRepository: DiscoverySourceRepository,
    private readonly bootstrapSources: DiscoverySource[] = defaultDiscoverySources
  ) {}

  async discoverForProfile(userId: string, profileId: string): Promise<ProfileDiscoverySummary> {
    const profile = await this.profileRepository.findById(userId, profileId);
    if (profile === null) throw new HttpError(404, "Profile not found");

    const globalSummary = await this.discoverAllSources(profile);
    const matchingJobs = globalSummary.jobs;
    const matchingIds = new Set(matchingJobs.map(({ job }) => job.id));

    return {
      checked: globalSummary.checked,
      skippedSources: 0,
      created: matchingJobs.filter((item) => item.created).length,
      updated: matchingJobs.filter((item) => !item.created).length,
      skippedIneligible:
        globalSummary.sources.reduce((total, source) => total + source.normalized, 0) - matchingJobs.length,
      failed: globalSummary.failed,
      globallyCreated: globalSummary.created,
      globallyUpdated: globalSummary.updated,
      jobs: matchingJobs.map(({ job }) => job),
      sources: globalSummary.sources.map((source) => {
        const sourceJobs = globalSummary.jobs.filter(
          ({ job }) => matchingIds.has(job.id) && normalizeText(job.companyName) === normalizeText(source.companyName)
        );
        return {
          ...source,
          stored: sourceJobs.length,
          skippedIneligible: Math.max(0, source.normalized - sourceJobs.length)
        };
      })
    };
  }

  async discoverAllSources(profile?: CareerProfile): Promise<GlobalDiscoverySummary> {
    await this.sourceRepository.ensureSources(this.bootstrapSources);
    const sources = await this.sourceRepository.findActive();
    const summary: GlobalDiscoverySummary = {
      checked: 0,
      created: 0,
      updated: 0,
      failed: 0,
      jobs: [],
      sources: []
    };

    for (let offset = 0; offset < sources.length; offset += sourceConcurrency) {
      const outcomes = await Promise.all(
        sources.slice(offset, offset + sourceConcurrency).map((source) => this.discoverSource(source, profile))
      );
      for (const outcome of outcomes) {
        summary.checked += 1;
        summary.created += outcome.result.created;
        summary.updated += outcome.result.updated;
        summary.failed += outcome.result.failed ? 1 : 0;
        summary.jobs.push(...outcome.jobs);
        summary.sources.push(outcome.result);
      }
    }

    return summary;
  }

  private async discoverSource(source: DiscoverySource, profile?: CareerProfile): Promise<SourceDiscoveryOutcome> {
    const startedAt = new Date();
    console.info(`[discovery] source=${source.id} provider=${source.provider} status=started`);
    const result: ProfileDiscoverySourceResult = {
      sourceId: source.id,
      companyName: source.companyName,
      provider: source.provider,
      fetched: 0,
      normalized: 0,
      stored: 0,
      created: 0,
      updated: 0,
      skippedIneligible: 0,
      failed: false,
      failedPostings: 0
    };
    const jobs: DiscoveredJob[] = [];

    try {
      const rawJobs = await this.careerPageFetcher.fetchJobs(toCompanyWatch(source));
      result.fetched = rawJobs.length;

      for (const rawJob of rawJobs) {
        try {
          const normalizedJob = normalizeRawJobPosting(rawJob);
          if (source.stage !== undefined) normalizedJob.companyStage = source.stage;
          const persisted = await this.jobRepository.upsertBySourceUrl(normalizedJob);
          result.normalized += 1;
          result.stored += 1;
          if (persisted.created) result.created += 1;
          else result.updated += 1;
          // Scheduled scans only need persistence and metrics. Keeping every
          // full description alive until all sources finish exhausted Render.
          if (profile !== undefined && isProfileMatch(persisted.job, profile)) {
            jobs.push(persisted);
          }
        } catch {
          result.failedPostings += 1;
        }
      }
    } catch (error) {
      result.failed = true;
      result.error = error instanceof Error ? error.message : "Unknown discovery error";
      console.error(
        `[discovery] source=${source.id} provider=${source.provider} status=failed error=${result.error}`
      );
    }

    await this.sourceRepository.recordRun(source.id, startedAt, new Date(), {
      fetched: result.fetched,
      normalized: result.normalized,
      created: result.created,
      updated: result.updated,
      failed: result.failedPostings + (result.failed ? 1 : 0),
      ...(result.error === undefined ? {} : { error: result.error })
    });
    if (!result.failed) {
      console.info(
        `[discovery] source=${source.id} provider=${source.provider} status=completed fetched=${result.fetched} stored=${result.stored}`
      );
    }
    return { result, jobs };
  }
}

function isProfileMatch(job: CanonicalJob, profile: CareerProfile): boolean {
  if (profile.excludedCompanies.some((company) => normalizeText(company) === normalizeText(job.companyName))) {
    return false;
  }
  const recommendation = buildRecommendation(job, profile);
  return recommendation.eligibility !== "INELIGIBLE" && isStrictProfileMatch(job, profile);
}

function toCompanyWatch(source: DiscoverySource): CompanyWatch {
  return {
    id: source.id,
    userId: "system",
    profileId: "global",
    companyName: source.companyName,
    careersUrl: source.careersUrl,
    checkCadenceDays: 1,
    isActive: true,
    createdAt: new Date()
  };
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").replace(/\s+/g, " ").trim();
}
