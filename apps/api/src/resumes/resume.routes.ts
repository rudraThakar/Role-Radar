import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../shared/async-handler.js";
import { ResumeController } from "./resume.controller.js";
import type { ResumeFileStorage } from "./resume-file-storage.js";
import type { ResumeService } from "./resume.service.js";
import { uploadResume } from "./resume-upload.middleware.js";

export function createResumeRouter(
  resumeService: ResumeService,
  resumeFileStorage: ResumeFileStorage,
  authenticate: RequestHandler
): Router {
  const router = Router({ mergeParams: true });
  const controller = new ResumeController(resumeService, resumeFileStorage);

  router.use(authenticate);
  router.get("/", asyncHandler(controller.listResumes.bind(controller)));
  router.post("/", uploadResume.single("resume"), asyncHandler(controller.createResume.bind(controller)));
  router.get("/:resumeId/suggested-skills", asyncHandler(controller.suggestSkills.bind(controller)));
  router.get("/:resumeId/suggested-targets", asyncHandler(controller.suggestProfileTargets.bind(controller)));
  router.patch("/:resumeId/activate", asyncHandler(controller.activateResume.bind(controller)));

  return router;
}
