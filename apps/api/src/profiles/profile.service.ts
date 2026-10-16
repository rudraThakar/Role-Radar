import type { CareerProfile } from "@roleradar/domain";

import { HttpError } from "../shared/http-error.js";
import type { CreateProfileInput, UpdateProfileInput } from "./profile.dto.js";
import type { ProfileRepository } from "./profile.repository.js";

export class ProfileService {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async listProfiles(userId: string): Promise<CareerProfile[]> {
    return this.profileRepository.findAll(userId);
  }

  async getProfile(userId: string, profileId: string): Promise<CareerProfile> {
    const profile = await this.profileRepository.findById(userId, profileId);
    if (profile === null) {
      throw new HttpError(404, "Profile not found");
    }

    return profile;
  }

  async createProfile(userId: string, input: CreateProfileInput): Promise<CareerProfile> {
    return this.profileRepository.create(userId, input);
  }

  async updateProfile(userId: string, profileId: string, input: UpdateProfileInput): Promise<CareerProfile> {
    const profile = await this.profileRepository.update(userId, profileId, input);
    if (profile === null) {
      throw new HttpError(404, "Profile not found");
    }

    return profile;
  }

  async deleteProfile(userId: string, profileId: string): Promise<void> {
    const deleted = await this.profileRepository.delete(userId, profileId);
    if (!deleted) {
      throw new HttpError(404, "Profile not found");
    }
  }
}
