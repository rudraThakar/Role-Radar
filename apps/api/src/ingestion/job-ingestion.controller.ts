import type { Request, Response } from "express";

import { requireAuthUser } from "../auth/auth.middleware.js";
import { HttpError } from "../shared/http-error.js";
import { parseImportJobsInput } from "./ingestion.dto.js";
import type { JobIngestionService } from "./job-ingestion.service.js";

export class JobIngestionController {
  constructor(private readonly jobIngestionService: JobIngestionService) {}

  async importJobs(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const result = await this.jobIngestionService.importJobsForProfile(
      user.id,
      requiredProfileId(request),
      parseImportJobsInput(request.body)
    );
    response.status(201).json({ data: result });
  }
}

function requiredProfileId(request: Request): string {
  const profileId = request.params.profileId;
  if (profileId === undefined || profileId.trim().length === 0) {
    throw new HttpError(400, "profileId route parameter is required");
  }

  return profileId;
}
