import type { Request, Response } from "express";

import { HttpError } from "../shared/http-error.js";
import type { ScheduledDiscoveryService } from "./scheduled-discovery.service.js";

export class ScheduledDiscoveryController {
  constructor(
    private readonly scheduledDiscoveryService: ScheduledDiscoveryService,
    private readonly cronSecret: string | undefined
  ) {}

  async run(request: Request, response: Response): Promise<void> {
    if (this.cronSecret === undefined || request.header("x-cron-secret") !== this.cronSecret) {
      throw new HttpError(401, "Valid cron secret is required");
    }
    response.status(200).json({ data: await this.scheduledDiscoveryService.run() });
  }
}
