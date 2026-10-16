import type { Request, Response } from "express";

import { parseCreateJobInput } from "./job.dto.js";
import type { JobService } from "./job.service.js";

export class JobController {
  constructor(private readonly jobService: JobService) {}

  async listJobs(_request: Request, response: Response): Promise<void> {
    const jobs = await this.jobService.listJobs();
    response.status(200).json({ data: jobs });
  }

  async createJob(request: Request, response: Response): Promise<void> {
    const job = await this.jobService.createJob(parseCreateJobInput(request.body));
    response.status(201).json({ data: job });
  }
}

