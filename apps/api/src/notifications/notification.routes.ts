import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../shared/async-handler.js";
import { NotificationController } from "./notification.controller.js";
import type { NotificationService } from "./notification.service.js";

export function createNotificationRouter(notificationService: NotificationService, authenticate: RequestHandler): Router {
  const router = Router();
  const controller = new NotificationController(notificationService);
  router.use(authenticate);
  router.get("/", asyncHandler(controller.list.bind(controller)));
  router.post("/:notificationId/read", asyncHandler(controller.markRead.bind(controller)));
  return router;
}
