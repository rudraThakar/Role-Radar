import type { PrismaClient } from "@prisma/client";

import type { CanonicalJob } from "@roleradar/domain";

import type { ApplicationStageValue, JobStateValue, UserJobState } from "./job-state.types.js";
import type { UpdateJobApplicationInput } from "./job-application.dto.js";

export interface JobStateRepository {
  findForProfile(userId: string, profileId: string): Promise<UserJobState[]>;
  findWithJobsForProfile(userId: string, profileId: string, state?: JobStateValue): Promise<Array<UserJobState & { job: CanonicalJob }>>;
  findOne(userId: string, profileId: string, jobId: string): Promise<UserJobState | null>;
  setState(userId: string, profileId: string, jobId: string, state: JobStateValue): Promise<UserJobState>;
  updateApplication(userId: string, profileId: string, jobId: string, input: UpdateJobApplicationInput): Promise<UserJobState | null>;
  clearState(userId: string, profileId: string, jobId: string): Promise<boolean>;
}

export class InMemoryJobStateRepository implements JobStateRepository {
  private readonly states = new Map<string, UserJobState>();

  async findForProfile(userId: string, profileId: string): Promise<UserJobState[]> {
    return [...this.states.values()].filter((state) => state.userId === userId && state.profileId === profileId);
  }

  async findWithJobsForProfile(): Promise<Array<UserJobState & { job: CanonicalJob }>> {
    throw new Error("InMemoryJobStateRepository.findWithJobsForProfile requires integration with a job repository");
  }

  async findOne(userId: string, profileId: string, jobId: string): Promise<UserJobState | null> {
    return this.states.get(stateKey(userId, profileId, jobId)) ?? null;
  }

  async setState(userId: string, profileId: string, jobId: string, state: JobStateValue): Promise<UserJobState> {
    const existingState = this.states.get(stateKey(userId, profileId, jobId));
    const userJobState: UserJobState = {
      ...existingState,
      userId,
      profileId,
      jobId,
      state,
      ...(state === "APPLIED" ? { applicationStage: existingState?.applicationStage ?? "APPLIED", appliedAt: existingState?.appliedAt ?? new Date() } : {})
    };
    this.states.set(stateKey(userId, profileId, jobId), userJobState);
    return userJobState;
  }

  async updateApplication(userId: string, profileId: string, jobId: string, input: UpdateJobApplicationInput): Promise<UserJobState | null> {
    const existingState = this.states.get(stateKey(userId, profileId, jobId));
    if (existingState === undefined) {
      return null;
    }

    const updatedState: UserJobState = {
      ...existingState,
      state: "APPLIED",
      applicationStage: input.applicationStage ?? existingState.applicationStage ?? "APPLIED",
      appliedAt: existingState.appliedAt ?? new Date()
    };
    if (input.applicationNotes !== undefined) {
      updatedState.applicationNotes = input.applicationNotes;
    } else if (existingState.applicationNotes !== undefined) {
      updatedState.applicationNotes = existingState.applicationNotes;
    }
    this.states.set(stateKey(userId, profileId, jobId), updatedState);
    return updatedState;
  }

  async clearState(userId: string, profileId: string, jobId: string): Promise<boolean> {
    return this.states.delete(stateKey(userId, profileId, jobId));
  }
}

export class PrismaJobStateRepository implements JobStateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findForProfile(userId: string, profileId: string): Promise<UserJobState[]> {
    const states = await this.prisma.$queryRaw<UserJobStateRow[]>`
      SELECT "userId", "profileId", "jobId", "state", "applicationStage", "applicationNotes", "appliedAt"
      FROM "UserJobState"
      WHERE "userId" = ${userId} AND "profileId" = ${profileId}
    `;

    return states.map(toUserJobState);
  }

  async findWithJobsForProfile(userId: string, profileId: string, state?: JobStateValue): Promise<Array<UserJobState & { job: CanonicalJob }>> {
    const states =
      state === undefined
        ? await this.prisma.$queryRaw<UserJobStateRow[]>`
            SELECT "userId", "profileId", "jobId", "state", "applicationStage", "applicationNotes", "appliedAt"
            FROM "UserJobState"
            WHERE "userId" = ${userId} AND "profileId" = ${profileId}
            ORDER BY "updatedAt" DESC
          `
        : await this.prisma.$queryRaw<UserJobStateRow[]>`
            SELECT "userId", "profileId", "jobId", "state", "applicationStage", "applicationNotes", "appliedAt"
            FROM "UserJobState"
            WHERE "userId" = ${userId} AND "profileId" = ${profileId} AND "state" = ${state}::"JobState"
            ORDER BY "updatedAt" DESC
          `;

    if (states.length === 0) {
      return [];
    }

    const jobs = await this.prisma.job.findMany({
      where: {
        id: {
          in: states.map((userJobState) => userJobState.jobId)
        }
      }
    });
    const jobsById = new Map(jobs.map((job) => [job.id, job]));

    return states.flatMap((userJobState) => {
      const job = jobsById.get(userJobState.jobId);
      if (job === undefined) return [];
      return [{ ...toUserJobState(userJobState), job: toCanonicalJob(job) }];
    });
  }

  async findOne(userId: string, profileId: string, jobId: string): Promise<UserJobState | null> {
    const states = await this.prisma.$queryRaw<UserJobStateRow[]>`
      SELECT "userId", "profileId", "jobId", "state", "applicationStage", "applicationNotes", "appliedAt"
      FROM "UserJobState"
      WHERE "userId" = ${userId} AND "profileId" = ${profileId} AND "jobId" = ${jobId}
      LIMIT 1
    `;
    const state = states[0] ?? null;

    return state === null ? null : toUserJobState(state);
  }

  async setState(userId: string, profileId: string, jobId: string, state: JobStateValue): Promise<UserJobState> {
    await this.prisma.userJobState.upsert({
      where: {
        userId_profileId_jobId: { userId, profileId, jobId }
      },
      update: { state },
      create: { userId, profileId, jobId, state }
    });

    if (state === "APPLIED") {
      await this.prisma.$executeRaw`
        UPDATE "UserJobState"
        SET "applicationStage" = COALESCE("applicationStage", 'APPLIED'::"ApplicationStage"),
            "appliedAt" = COALESCE("appliedAt", NOW())
        WHERE "userId" = ${userId} AND "profileId" = ${profileId} AND "jobId" = ${jobId}
      `;
    }

    const updatedState = await this.findOne(userId, profileId, jobId);
    if (updatedState === null) {
      throw new Error("Could not persist job state");
    }
    return updatedState;
  }

  async updateApplication(userId: string, profileId: string, jobId: string, input: UpdateJobApplicationInput): Promise<UserJobState | null> {
    const existingState = await this.findOne(userId, profileId, jobId);
    if (existingState === null) {
      return null;
    }

    const applicationStage = input.applicationStage ?? existingState.applicationStage ?? "APPLIED";
    if (input.applicationNotes === undefined) {
      await this.prisma.$executeRaw`
        UPDATE "UserJobState"
        SET "state" = 'APPLIED'::"JobState",
            "applicationStage" = ${applicationStage}::"ApplicationStage",
            "appliedAt" = COALESCE("appliedAt", NOW())
        WHERE "userId" = ${userId} AND "profileId" = ${profileId} AND "jobId" = ${jobId}
      `;
    } else {
      await this.prisma.$executeRaw`
        UPDATE "UserJobState"
        SET "state" = 'APPLIED'::"JobState",
            "applicationStage" = ${applicationStage}::"ApplicationStage",
            "applicationNotes" = ${input.applicationNotes},
            "appliedAt" = COALESCE("appliedAt", NOW())
        WHERE "userId" = ${userId} AND "profileId" = ${profileId} AND "jobId" = ${jobId}
      `;
    }

    return this.findOne(userId, profileId, jobId);
  }

  async clearState(userId: string, profileId: string, jobId: string): Promise<boolean> {
    const existingState = await this.findOne(userId, profileId, jobId);
    if (existingState === null) {
      return false;
    }

    await this.prisma.userJobState.delete({
      where: {
        userId_profileId_jobId: { userId, profileId, jobId }
      }
    });

    return true;
  }
}

interface UserJobStateRow {
  userId: string;
  profileId: string;
  jobId: string;
  state: JobStateValue;
  applicationStage: ApplicationStageValue | null;
  applicationNotes: string | null;
  appliedAt: Date | null;
}

function toUserJobState(state: UserJobStateRow): UserJobState {
  const userJobState: UserJobState = {
    userId: state.userId,
    profileId: state.profileId,
    jobId: state.jobId,
    state: state.state
  };

  if (state.applicationStage !== undefined && state.applicationStage !== null) userJobState.applicationStage = state.applicationStage;
  if (state.applicationNotes !== undefined && state.applicationNotes !== null) userJobState.applicationNotes = state.applicationNotes;
  if (state.appliedAt !== undefined && state.appliedAt !== null) userJobState.appliedAt = state.appliedAt;

  return userJobState;
}

function toCanonicalJob(job: {
  id: string;
  companyName: string;
  title: string;
  normalizedTitle: string;
  description: string;
  employmentType: CanonicalJob["employmentType"];
  seniority: CanonicalJob["seniority"];
  domains: CanonicalJob["domains"];
  skills: string[];
  minimumExperienceMonths: number | null;
  maximumExperienceMonths: number | null;
  eligibleGraduationYears: number[];
  locations: string[];
  workMode: CanonicalJob["workMode"];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  sourceUrl: string;
  applyUrl: string;
  publishedAt: Date | null;
  discoveredAt: Date;
  expiresAt: Date | null;
}): CanonicalJob {
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

function stateKey(userId: string, profileId: string, jobId: string): string {
  return `${userId}:${profileId}:${jobId}`;
}
