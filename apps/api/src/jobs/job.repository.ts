import { buildJobFingerprint, canonicalizeJobUrl, type CanonicalJob, type ProfileDomain } from "@roleradar/domain";
import type { ProfileDomain as PrismaProfileDomain, PrismaClient } from "@prisma/client";

import type { CreateJobInput } from "./job.dto.js";

export interface JobRepository {
  findAll(): Promise<CanonicalJob[]>;
  findByDomain(domain: ProfileDomain): Promise<CanonicalJob[]>;
  findById(jobId: string): Promise<CanonicalJob | null>;
  create(input: CreateJobInput): Promise<CanonicalJob>;
  upsertBySourceUrl(input: CreateJobInput): Promise<{ job: CanonicalJob; created: boolean }>;
  expireStale(cutoff: Date, expiredAt: Date): Promise<number>;
}

export class InMemoryJobRepository implements JobRepository {
  private readonly jobs = new Map<string, CanonicalJob>();
  private readonly lastSeenAt = new Map<string, Date>();

  async findAll(): Promise<CanonicalJob[]> {
    const now = Date.now();
    return [...this.jobs.values()].filter((job) => job.expiresAt === undefined || job.expiresAt.getTime() > now);
  }

  async findByDomain(domain: ProfileDomain): Promise<CanonicalJob[]> {
    return (await this.findAll()).filter((job) => job.domains.includes(domain));
  }

  async findById(jobId: string): Promise<CanonicalJob | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async create(input: CreateJobInput): Promise<CanonicalJob> {
    const normalizedInput = normalizeJobUrls(input);
    const job: CanonicalJob = {
      id: crypto.randomUUID(),
      ...normalizedInput,
      evidence: []
    };

    this.jobs.set(job.id, job);
    this.lastSeenAt.set(job.id, new Date());
    return job;
  }

  async upsertBySourceUrl(input: CreateJobInput): Promise<{ job: CanonicalJob; created: boolean }> {
    const normalizedInput = normalizeJobUrls(input);
    if (!isLikelyRealJobSourceUrl(normalizedInput.sourceUrl)) {
      throw new Error(`Refusing to persist non-job source URL: ${input.sourceUrl}`);
    }

    const fingerprint = buildJobFingerprint(normalizedInput);
    const existingJob = [...this.jobs.values()].find(
      (job) => job.sourceUrl === normalizedInput.sourceUrl || buildJobFingerprint(job) === fingerprint
    );
    if (existingJob === undefined) {
      return { job: await this.create(normalizedInput), created: true };
    }

    const updatedJob = mergeJob(existingJob, normalizedInput);
    this.jobs.set(updatedJob.id, updatedJob);
    this.lastSeenAt.set(updatedJob.id, new Date());
    return { job: updatedJob, created: false };
  }

  async expireStale(cutoff: Date, expiredAt: Date): Promise<number> {
    let expired = 0;
    for (const [jobId, lastSeenAt] of this.lastSeenAt) {
      const job = this.jobs.get(jobId);
      if (job !== undefined && job.expiresAt === undefined && lastSeenAt < cutoff) {
        this.jobs.set(jobId, { ...job, expiresAt: expiredAt });
        expired += 1;
      }
    }
    return expired;
  }
}

export class PrismaJobRepository implements JobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<CanonicalJob[]> {
    const jobs = await this.prisma.job.findMany({
      where: {
        AND: [
          { sourceUrl: { not: { startsWith: "https://jobs.example.local/" } } },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
        ]
      },
      orderBy: { discoveredAt: "desc" },
      take: 5000
    });

    return jobs.map(toCanonicalJob).filter((job) => isLikelyRealJobSourceUrl(job.sourceUrl));
  }

  async findByDomain(domain: ProfileDomain): Promise<CanonicalJob[]> {
    const jobs = await this.prisma.job.findMany({
      where: {
        domains: { has: domain as PrismaProfileDomain },
        AND: [
          { sourceUrl: { not: { startsWith: "https://jobs.example.local/" } } },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
        ]
      },
      orderBy: { discoveredAt: "desc" },
      take: 5000
    });

    return jobs.map(toCanonicalJob).filter((job) => isLikelyRealJobSourceUrl(job.sourceUrl));
  }

  async findById(jobId: string): Promise<CanonicalJob | null> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId }
    });

    return job === null ? null : toCanonicalJob(job);
  }

  async create(input: CreateJobInput): Promise<CanonicalJob> {
    const normalizedInput = normalizeJobUrls(input);
    if (!isLikelyRealJobSourceUrl(normalizedInput.sourceUrl)) {
      throw new Error(`Refusing to persist non-job source URL: ${input.sourceUrl}`);
    }

    const job = await this.prisma.job.create({
      data: toPrismaJobWriteInput(normalizedInput)
    });

    return toCanonicalJob(job);
  }

  async upsertBySourceUrl(input: CreateJobInput): Promise<{ job: CanonicalJob; created: boolean }> {
    const normalizedInput = normalizeJobUrls(input);
    if (!isLikelyRealJobSourceUrl(normalizedInput.sourceUrl)) {
      throw new Error(`Refusing to persist non-job source URL: ${input.sourceUrl}`);
    }

    const exactJob = await this.prisma.job.findUnique({
      where: { sourceUrl: normalizedInput.sourceUrl }
    });
    const fingerprint = buildJobFingerprint(normalizedInput);
    const candidates =
      exactJob === null
        ? await this.prisma.job.findMany({
            where: {
              normalizedTitle: normalizedInput.normalizedTitle,
              companyName: { equals: normalizedInput.companyName, mode: "insensitive" }
            },
            take: 25
          })
        : [];
    const duplicateJob = candidates.find((candidate) => buildJobFingerprint(toCanonicalJob(candidate)) === fingerprint);
    const existingJob = exactJob ?? duplicateJob ?? null;

    if (existingJob === null) {
      return { job: await this.create(normalizedInput), created: true };
    }

    const mergedInput = mergeJob(toCanonicalJob(existingJob), normalizedInput);
    const job = await this.prisma.job.update({
      where: { id: existingJob.id },
      data: {
        ...toPrismaJobWriteInput(toCreateJobInput(mergedInput)),
        companyStage: normalizedInput.companyStage ?? existingJob.companyStage,
        minimumExperienceMonths: normalizedInput.minimumExperienceMonths ?? null,
        maximumExperienceMonths: normalizedInput.maximumExperienceMonths ?? null,
        discoveredAt: existingJob.discoveredAt,
        expiresAt: null
      }
    });

    return { job: toCanonicalJob(job), created: false };
  }

  async expireStale(cutoff: Date, expiredAt: Date): Promise<number> {
    const result = await this.prisma.job.updateMany({
      where: {
        expiresAt: null,
        updatedAt: { lt: cutoff }
      },
      data: { expiresAt: expiredAt }
    });
    return result.count;
  }
}

function normalizeJobUrls(input: CreateJobInput): CreateJobInput {
  return {
    ...input,
    sourceUrl: canonicalizeJobUrl(input.sourceUrl),
    applyUrl: canonicalizeJobUrl(input.applyUrl)
  };
}

function mergeJob(existing: CanonicalJob, incoming: CreateJobInput): CanonicalJob {
  const useIncomingUrl = sourcePreference(incoming.sourceUrl) > sourcePreference(existing.sourceUrl);
  return {
    ...existing,
    ...incoming,
    id: existing.id,
    description: incoming.description.length >= existing.description.length ? incoming.description : existing.description,
    // Classification and experience come from the latest posting text so
    // improved rules replace stale values instead of accumulating them.
    domains: incoming.domains,
    skills: unique([...existing.skills, ...incoming.skills]),
    locations: unique([...existing.locations, ...incoming.locations]),
    sourceUrl: useIncomingUrl ? incoming.sourceUrl : existing.sourceUrl,
    applyUrl: useIncomingUrl ? incoming.applyUrl : existing.applyUrl,
    discoveredAt: existing.discoveredAt,
    evidence: existing.evidence
  };
}

function sourcePreference(sourceUrl: string): number {
  try {
    const hostname = new URL(sourceUrl).hostname.toLowerCase();
    if (hostname.includes("myworkdayjobs.com")) return 3;
    if (hostname.includes("greenhouse.io") || hostname === "jobs.lever.co" || hostname === "jobs.ashbyhq.com") return 3;
    return 2;
  } catch {
    return 0;
  }
}

function unique<TValue>(values: TValue[]): TValue[] {
  return [...new Set(values)];
}

function toCreateJobInput(job: CanonicalJob): CreateJobInput {
  const { id: _id, evidence: _evidence, ...input } = job;
  return input;
}

function toPrismaJobWriteInput(input: CreateJobInput): Omit<CreateJobInput, "domains"> & {
  domains: PrismaProfileDomain[];
  eligibleGraduationYears: number[];
} {
  return {
    ...input,
    // Prisma's generated enum is refreshed by `db:generate` after migrations.
    // Keep this cast at the persistence boundary so the domain package remains
    // the single source of truth for supported profile domains.
    domains: input.domains as PrismaProfileDomain[],
    eligibleGraduationYears: input.eligibleGraduationYears ?? []
  };
}

type PrismaJob = Awaited<ReturnType<PrismaClient["job"]["findUnique"]>>;

function toCanonicalJob(job: NonNullable<PrismaJob>): CanonicalJob {
  const canonicalJob: CanonicalJob = {
    id: job.id,
    companyName: job.companyName,
    title: job.title,
    normalizedTitle: job.normalizedTitle,
    description: job.description,
    employmentType: job.employmentType,
    seniority: job.seniority,
    domains: job.domains,
    skills: job.skills,
    locations: job.locations,
    workMode: job.workMode,
    sourceUrl: job.sourceUrl,
    applyUrl: job.applyUrl,
    discoveredAt: job.discoveredAt,
    evidence: []
  };

  if (job.companyStage === "STARTUP" || job.companyStage === "ESTABLISHED") canonicalJob.companyStage = job.companyStage;
  if (job.minimumExperienceMonths !== null) canonicalJob.minimumExperienceMonths = job.minimumExperienceMonths;
  if (job.maximumExperienceMonths !== null) canonicalJob.maximumExperienceMonths = job.maximumExperienceMonths;
  if (job.eligibleGraduationYears.length > 0) canonicalJob.eligibleGraduationYears = job.eligibleGraduationYears;
  if (job.salaryMin !== null) canonicalJob.salaryMin = job.salaryMin;
  if (job.salaryMax !== null) canonicalJob.salaryMax = job.salaryMax;
  if (job.salaryCurrency !== null) canonicalJob.salaryCurrency = job.salaryCurrency;
  if (job.publishedAt !== null) canonicalJob.publishedAt = job.publishedAt;
  if (job.expiresAt !== null) canonicalJob.expiresAt = job.expiresAt;

  return canonicalJob;
}

export function isLikelyRealJobSourceUrl(sourceUrl: string): boolean {
  try {
    const url = new URL(sourceUrl);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    if (hostname.includes("myworkdayjobs.com")) return pathname.includes("/job/");
    if (hostname === "boards.greenhouse.io" || hostname === "job-boards.greenhouse.io") return pathname.includes("/jobs/");
    if (hostname === "jobs.lever.co") return pathname.split("/").filter(Boolean).length >= 2;
    if (hostname === "jobs.ashbyhq.com") return pathname.split("/").filter(Boolean).length >= 2;
    if (hostname === "apply.workable.com") return /^\/j\/[^/]+/.test(pathname);
    if (hostname === "jobs.smartrecruiters.com") return pathname.split("/").filter(Boolean).length >= 2;
    if (hostname === "careers.amd.com") return /^\/careers-home\/jobs\/\d+/.test(pathname) || /^\/jobs\/\d+/.test(pathname);

    return /\/job(s)?\/[^/?#]+/.test(pathname);
  } catch {
    return false;
  }
}
