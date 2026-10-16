import type { CanonicalJob } from "@roleradar/domain";
import type { PrismaClient } from "@prisma/client";

import type { CreateJobInput } from "./job.dto.js";

export interface JobRepository {
  findAll(): Promise<CanonicalJob[]>;
  findById(jobId: string): Promise<CanonicalJob | null>;
  create(input: CreateJobInput): Promise<CanonicalJob>;
  upsertBySourceUrl(input: CreateJobInput): Promise<{ job: CanonicalJob; created: boolean }>;
}

export class InMemoryJobRepository implements JobRepository {
  private readonly jobs = new Map<string, CanonicalJob>();

  async findAll(): Promise<CanonicalJob[]> {
    return [...this.jobs.values()];
  }

  async findById(jobId: string): Promise<CanonicalJob | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async create(input: CreateJobInput): Promise<CanonicalJob> {
    const job: CanonicalJob = {
      id: crypto.randomUUID(),
      ...input,
      evidence: []
    };

    this.jobs.set(job.id, job);
    return job;
  }

  async upsertBySourceUrl(input: CreateJobInput): Promise<{ job: CanonicalJob; created: boolean }> {
    if (!isLikelyRealJobSourceUrl(input.sourceUrl)) {
      throw new Error(`Refusing to persist non-job source URL: ${input.sourceUrl}`);
    }

    const existingJob = [...this.jobs.values()].find((job) => job.sourceUrl === input.sourceUrl);
    if (existingJob === undefined) {
      return { job: await this.create(input), created: true };
    }

    const updatedJob: CanonicalJob = {
      ...existingJob,
      ...input,
      id: existingJob.id,
      evidence: existingJob.evidence
    };
    this.jobs.set(updatedJob.id, updatedJob);
    return { job: updatedJob, created: false };
  }
}

export class PrismaJobRepository implements JobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<CanonicalJob[]> {
    const jobs = await this.prisma.job.findMany({
      where: {
        sourceUrl: {
          not: {
            startsWith: "https://jobs.example.local/"
          }
        }
      },
      orderBy: { discoveredAt: "desc" }
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
    if (!isLikelyRealJobSourceUrl(input.sourceUrl)) {
      throw new Error(`Refusing to persist non-job source URL: ${input.sourceUrl}`);
    }

    const job = await this.prisma.job.create({
      data: toPrismaJobWriteInput(input)
    });

    return toCanonicalJob(job);
  }

  async upsertBySourceUrl(input: CreateJobInput): Promise<{ job: CanonicalJob; created: boolean }> {
    if (!isLikelyRealJobSourceUrl(input.sourceUrl)) {
      throw new Error(`Refusing to persist non-job source URL: ${input.sourceUrl}`);
    }

    const existingJob = await this.prisma.job.findUnique({
      where: { sourceUrl: input.sourceUrl }
    });
    const job = await this.prisma.job.upsert({
      where: { sourceUrl: input.sourceUrl },
      update: toPrismaJobWriteInput(input),
      create: toPrismaJobWriteInput(input)
    });

    return { job: toCanonicalJob(job), created: existingJob === null };
  }
}

function toPrismaJobWriteInput(input: CreateJobInput): CreateJobInput & { eligibleGraduationYears: number[] } {
  return {
    ...input,
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
    if (hostname === "careers.amd.com") return /^\/careers-home\/jobs\/\d+/.test(pathname) || /^\/jobs\/\d+/.test(pathname);

    return /\/job(s)?\/[^/?#]+/.test(pathname);
  } catch {
    return false;
  }
}
