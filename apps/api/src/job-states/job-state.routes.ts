import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../shared/async-handler.js";
import { JobStateController } from "./job-state.controller.js";
import type { JobStateService } from "./job-state.service.js";

export function createJobStateRouter(jobStateService: JobStateService, authenticate: RequestHandler): Router {
  const router = Router({ mergeParams: true });
  const controller = new JobStateController(jobStateService);

  router.use(authenticate);
  router.get("/states", asyncHandler(controller.listStates.bind(controller)));
  router.post("/:jobId/save", asyncHandler(controller.saveJob.bind(controller)));
  router.post("/:jobId/hide", asyncHandler(controller.hideJob.bind(controller)));
  router.post("/:jobId/mark-applied", asyncHandler(controller.markApplied.bind(controller)));
  router.patch("/:jobId/application", asyncHandler(controller.updateApplication.bind(controller)));
  router.post("/:jobId/view", asyncHandler(controller.markViewed.bind(controller)));
  router.delete("/:jobId/state", asyncHandler(controller.clearState.bind(controller)));

  return router;
}
