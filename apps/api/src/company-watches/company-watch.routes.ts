import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../shared/async-handler.js";
import { CompanyWatchController } from "./company-watch.controller.js";
import type { CompanyWatchService } from "./company-watch.service.js";

export function createCompanyWatchRouter(companyWatchService: CompanyWatchService, authenticate: RequestHandler): Router {
  const router = Router({ mergeParams: true });
  const controller = new CompanyWatchController(companyWatchService);

  router.use(authenticate);
  router.get("/", asyncHandler(controller.listCompanyWatches.bind(controller)));
  router.post("/bulk", asyncHandler(controller.bulkCreateCompanyWatches.bind(controller)));
  router.post("/check-now", asyncHandler(controller.checkNow.bind(controller)));
  router.post("/", asyncHandler(controller.createCompanyWatch.bind(controller)));
  router.post("/:watchId/mark-checked", asyncHandler(controller.markChecked.bind(controller)));
  router.delete("/:watchId", asyncHandler(controller.deleteCompanyWatch.bind(controller)));

  return router;
}
