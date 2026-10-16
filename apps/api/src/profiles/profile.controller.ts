import type { Request, Response } from "express";

import { requireAuthUser } from "../auth/auth.middleware.js";
import { HttpError } from "../shared/http-error.js";
import { parseCreateProfileInput, parseUpdateProfileInput } from "./profile.dto.js";
import type { ProfileService } from "./profile.service.js";

export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  async listProfiles(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const profiles = await this.profileService.listProfiles(user.id);
    response.status(200).json({ data: profiles });
  }

  async createProfile(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const input = parseCreateProfileInput(request.body);
    const profile = await this.profileService.createProfile(user.id, input);
    response.status(201).json({ data: profile });
  }

  async getProfile(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const profile = await this.profileService.getProfile(user.id, requiredProfileId(request));
    response.status(200).json({ data: profile });
  }

  async updateProfile(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const input = parseUpdateProfileInput(request.body);
    const profile = await this.profileService.updateProfile(user.id, requiredProfileId(request), input);
    response.status(200).json({ data: profile });
  }

  async deleteProfile(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    await this.profileService.deleteProfile(user.id, requiredProfileId(request));
    response.status(204).send();
  }
}

function requiredProfileId(request: Request): string {
  const profileId = request.params.profileId;
  if (profileId === undefined || profileId.trim().length === 0) {
    throw new HttpError(400, "profileId route parameter is required");
  }

  return profileId;
}
