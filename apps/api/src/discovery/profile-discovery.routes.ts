import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../shared/async-handler.js";
import { ProfileDiscoveryController } from "./profile-discovery.controller.js";
import type { ProfileDiscoveryService } from "./profile-discovery.service.js";

export function createProfileDiscoveryRouter(
  profileDiscoveryService: ProfileDiscoveryService,
  authenticate: RequestHandler
): Router {
  const router = Router({ mergeParams: true });
  const controller = new ProfileDiscoveryController(profileDiscoveryService);

  router.use(authenticate);
  router.post("/check-now", asyncHandler(controller.checkNow.bind(controller)));

  return router;
}
