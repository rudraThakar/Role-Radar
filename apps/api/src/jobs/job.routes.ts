import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../shared/async-handler.js";
import { JobController } from "./job.controller.js";
import type { JobService } from "./job.service.js";

export function createJobRouter(jobService: JobService, authenticate: RequestHandler): Router {
  const router = Router();
  const controller = new JobController(jobService);

  router.use(authenticate);
  router.get("/", asyncHandler(controller.listJobs.bind(controller)));
  router.post("/", asyncHandler(controller.createJob.bind(controller)));

  return router;
}

