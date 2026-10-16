import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../shared/async-handler.js";
import { JobIngestionController } from "./job-ingestion.controller.js";
import type { JobIngestionService } from "./job-ingestion.service.js";

export function createJobIngestionRouter(jobIngestionService: JobIngestionService, authenticate: RequestHandler): Router {
  const router = Router({ mergeParams: true });
  const controller = new JobIngestionController(jobIngestionService);

  router.use(authenticate);
  router.post("/jobs/import", asyncHandler(controller.importJobs.bind(controller)));

  return router;
}
