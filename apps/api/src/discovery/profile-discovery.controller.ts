import type { Request, Response } from "express";

import { requireAuthUser } from "../auth/auth.middleware.js";
import { HttpError } from "../shared/http-error.js";
import type { ProfileDiscoveryService } from "./profile-discovery.service.js";

export class ProfileDiscoveryController {
  constructor(private readonly profileDiscoveryService: ProfileDiscoveryService) {}

  async checkNow(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const summary = await this.profileDiscoveryService.discoverForProfile(user.id, requiredProfileId(request));
    response.status(200).json({ data: summary });
  }
}

function requiredProfileId(request: Request): string {
  const profileId = request.params.profileId;
  if (profileId === undefined || profileId.trim().length === 0) {
    throw new HttpError(400, "profileId route parameter is required");
  }

  return profileId;
}
