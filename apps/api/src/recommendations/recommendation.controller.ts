import type { Request, Response } from "express";

import { requireAuthUser } from "../auth/auth.middleware.js";
import { HttpError } from "../shared/http-error.js";
import type { RecommendationService } from "./recommendation.service.js";

export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  async listRecommendations(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const profileId = requiredProfileId(request);
    const recommendations = await this.recommendationService.listRecommendations(user.id, profileId);
    response.status(200).json({ data: recommendations });
  }
}

function requiredProfileId(request: Request): string {
  const profileId = request.params.profileId;
  if (profileId === undefined || profileId.trim().length === 0) {
    throw new HttpError(400, "profileId route parameter is required");
  }

  return profileId;
}

