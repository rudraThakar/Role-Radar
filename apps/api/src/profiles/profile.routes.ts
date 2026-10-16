import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../shared/async-handler.js";
import { ProfileController } from "./profile.controller.js";
import type { ProfileService } from "./profile.service.js";

export function createProfileRouter(profileService: ProfileService, authenticate: RequestHandler): Router {
  const router = Router();
  const controller = new ProfileController(profileService);

  router.use(authenticate);
  router.get("/", asyncHandler(controller.listProfiles.bind(controller)));
  router.post("/", asyncHandler(controller.createProfile.bind(controller)));
  router.get("/:profileId", asyncHandler(controller.getProfile.bind(controller)));
  router.patch("/:profileId", asyncHandler(controller.updateProfile.bind(controller)));
  router.delete("/:profileId", asyncHandler(controller.deleteProfile.bind(controller)));

  return router;
}
