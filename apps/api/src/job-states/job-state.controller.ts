import type { Request, Response } from "express";

import { requireAuthUser } from "../auth/auth.middleware.js";
import { HttpError } from "../shared/http-error.js";
import { parseUpdateJobApplicationInput } from "./job-application.dto.js";
import type { JobStateService } from "./job-state.service.js";
import { jobStateValues, type JobStateValue } from "./job-state.types.js";

export class JobStateController {
  constructor(private readonly jobStateService: JobStateService) {}

  async listStates(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const states = await this.jobStateService.listStates(user.id, requiredProfileId(request), optionalState(request));
    response.status(200).json({ data: states });
  }

  async saveJob(request: Request, response: Response): Promise<void> {
    await this.setState(request, response, "SAVED");
  }

  async hideJob(request: Request, response: Response): Promise<void> {
    await this.setState(request, response, "HIDDEN");
  }

  async markApplied(request: Request, response: Response): Promise<void> {
    await this.setState(request, response, "APPLIED");
  }

  async markViewed(request: Request, response: Response): Promise<void> {
    await this.setState(request, response, "VIEWED");
  }

  async updateApplication(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const userJobState = await this.jobStateService.updateApplication(
      user.id,
      requiredProfileId(request),
      requiredJobId(request),
      parseUpdateJobApplicationInput(request.body)
    );
    response.status(200).json({ data: userJobState });
  }

  async clearState(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    await this.jobStateService.clearState(user.id, requiredProfileId(request), requiredJobId(request));
    response.status(204).send();
  }

  private async setState(request: Request, response: Response, state: JobStateValue): Promise<void> {
    const user = requireAuthUser(request);
    const userJobState = await this.jobStateService.setState(user.id, requiredProfileId(request), requiredJobId(request), state);
    response.status(200).json({ data: userJobState });
  }
}

function optionalState(request: Request): JobStateValue | undefined {
  const state = request.query.state;
  if (state === undefined) {
    return undefined;
  }

  if (typeof state !== "string" || !jobStateValues.includes(state as JobStateValue)) {
    throw new HttpError(400, `state must be one of: ${jobStateValues.join(", ")}`);
  }

  return state as JobStateValue;
}

function requiredProfileId(request: Request): string {
  const profileId = request.params.profileId;
  if (profileId === undefined || profileId.trim().length === 0) {
    throw new HttpError(400, "profileId route parameter is required");
  }

  return profileId;
}

function requiredJobId(request: Request): string {
  const jobId = request.params.jobId;
  if (jobId === undefined || jobId.trim().length === 0) {
    throw new HttpError(400, "jobId route parameter is required");
  }

  return jobId;
}
