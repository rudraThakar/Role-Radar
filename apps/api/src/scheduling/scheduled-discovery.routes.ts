import { Router } from "express";

import { asyncHandler } from "../shared/async-handler.js";
import { ScheduledDiscoveryController } from "./scheduled-discovery.controller.js";
import type { ScheduledDiscoveryService } from "./scheduled-discovery.service.js";

export function createScheduledDiscoveryRouter(
  scheduledDiscoveryService: ScheduledDiscoveryService,
  cronSecret: string | undefined
): Router {
  const router = Router();
  const controller = new ScheduledDiscoveryController(scheduledDiscoveryService, cronSecret);
  router.post("/discovery", asyncHandler(controller.run.bind(controller)));
  return router;
}
