import type { Request, Response } from "express";

import { requireAuthUser } from "../auth/auth.middleware.js";
import { HttpError } from "../shared/http-error.js";
import { parseBulkCreateCompanyWatchesInput, parseCreateCompanyWatchInput } from "./company-watch.dto.js";
import type { CompanyWatchService } from "./company-watch.service.js";

export class CompanyWatchController {
  constructor(private readonly companyWatchService: CompanyWatchService) {}

  async listCompanyWatches(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const watches = await this.companyWatchService.listCompanyWatches(user.id, requiredProfileId(request));
    response.status(200).json({ data: watches });
  }

  async createCompanyWatch(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const watch = await this.companyWatchService.createCompanyWatch(
      user.id,
      requiredProfileId(request),
      parseCreateCompanyWatchInput(request.body)
    );
    response.status(201).json({ data: watch });
  }

  async bulkCreateCompanyWatches(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const result = await this.companyWatchService.bulkCreateCompanyWatches(
      user.id,
      requiredProfileId(request),
      parseBulkCreateCompanyWatchesInput(request.body)
    );
    response.status(201).json({ data: result });
  }

  async checkNow(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const result = await this.companyWatchService.checkNow(user.id, requiredProfileId(request));
    response.status(200).json({ data: result });
  }

  async deleteCompanyWatch(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    await this.companyWatchService.deleteCompanyWatch(user.id, requiredProfileId(request), requiredWatchId(request));
    response.status(204).send();
  }

  async markChecked(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const watch = await this.companyWatchService.markChecked(user.id, requiredProfileId(request), requiredWatchId(request));
    response.status(200).json({ data: watch });
  }
}

function requiredProfileId(request: Request): string {
  const profileId = request.params.profileId;
  if (profileId === undefined || profileId.trim().length === 0) {
    throw new HttpError(400, "profileId route parameter is required");
  }

  return profileId;
}

function requiredWatchId(request: Request): string {
  const watchId = request.params.watchId;
  if (watchId === undefined || watchId.trim().length === 0) {
    throw new HttpError(400, "watchId route parameter is required");
  }

  return watchId;
}
