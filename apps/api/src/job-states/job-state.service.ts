import type { CanonicalJob } from "@roleradar/domain";

import type { JobRepository } from "../jobs/job.repository.js";
import type { ProfileRepository } from "../profiles/profile.repository.js";
import { HttpError } from "../shared/http-error.js";
import type { UpdateJobApplicationInput } from "./job-application.dto.js";
import type { JobStateRepository } from "./job-state.repository.js";
import type { JobStateValue, UserJobState } from "./job-state.types.js";

export interface JobStateWithJob extends UserJobState {
  job: CanonicalJob;
}

export class JobStateService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly jobRepository: JobRepository,
    private readonly jobStateRepository: JobStateRepository
  ) {}

  async setState(userId: string, profileId: string, jobId: string, state: JobStateValue): Promise<UserJobState> {
    await this.ensureProfileAndJob(userId, profileId, jobId);
    return this.jobStateRepository.setState(userId, profileId, jobId, state);
  }

  async listStates(userId: string, profileId: string, state?: JobStateValue): Promise<JobStateWithJob[]> {
    const profile = await this.profileRepository.findById(userId, profileId);
    if (profile === null) {
      throw new HttpError(404, "Profile not found");
    }

    const states = await this.jobStateRepository.findForProfile(userId, profileId);
    const filteredStates = state === undefined ? states : states.filter((jobState) => jobState.state === state);

    const statesWithJobs = await Promise.all(
      filteredStates.map(async (jobState) => {
        const job = await this.jobRepository.findById(jobState.jobId);
        return job === null ? null : { ...jobState, job };
      })
    );

    return statesWithJobs.filter((jobState): jobState is JobStateWithJob => jobState !== null);
  }

  async clearState(userId: string, profileId: string, jobId: string): Promise<void> {
    await this.ensureProfileAndJob(userId, profileId, jobId);
    await this.jobStateRepository.clearState(userId, profileId, jobId);
  }

  async updateApplication(
    userId: string,
    profileId: string,
    jobId: string,
    input: UpdateJobApplicationInput
  ): Promise<UserJobState> {
    await this.ensureProfileAndJob(userId, profileId, jobId);
    const existingState = await this.jobStateRepository.findOne(userId, profileId, jobId);
    if (existingState === null) {
      await this.jobStateRepository.setState(userId, profileId, jobId, "APPLIED");
    }

    const updatedState = await this.jobStateRepository.updateApplication(userId, profileId, jobId, input);
    if (updatedState === null) {
      throw new HttpError(404, "Application state not found");
    }

    return updatedState;
  }

  private async ensureProfileAndJob(userId: string, profileId: string, jobId: string): Promise<void> {
    const profile = await this.profileRepository.findById(userId, profileId);
    if (profile === null) {
      throw new HttpError(404, "Profile not found");
    }

    const job = await this.jobRepository.findById(jobId);
    if (job === null) {
      throw new HttpError(404, "Job not found");
    }
  }
}
