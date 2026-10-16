import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../shared/async-handler.js";
import { RecommendationController } from "./recommendation.controller.js";
import type { RecommendationService } from "./recommendation.service.js";

export function createRecommendationRouter(
  recommendationService: RecommendationService,
  authenticate: RequestHandler
): Router {
  const router = Router({ mergeParams: true });
  const controller = new RecommendationController(recommendationService);

  router.use(authenticate);
  router.get("/", asyncHandler(controller.listRecommendations.bind(controller)));

  return router;
}

