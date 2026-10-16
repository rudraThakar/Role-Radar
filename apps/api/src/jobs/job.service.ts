import type { CanonicalJob } from "@roleradar/domain";

import type { CreateJobInput } from "./job.dto.js";
import type { JobRepository } from "./job.repository.js";

export class JobService {
  constructor(private readonly jobRepository: JobRepository) {}

  async listJobs(): Promise<CanonicalJob[]> {
    return this.jobRepository.findAll();
  }

  async createJob(input: CreateJobInput): Promise<CanonicalJob> {
    return this.jobRepository.create(input);
  }
}

