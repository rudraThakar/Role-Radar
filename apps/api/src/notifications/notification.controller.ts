import type { Request, Response } from "express";

import { requireAuthUser } from "../auth/auth.middleware.js";
import { HttpError } from "../shared/http-error.js";
import type { NotificationService } from "./notification.service.js";

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  async list(request: Request, response: Response): Promise<void> {
    const notifications = await this.notificationService.list(requireAuthUser(request).id);
    response.status(200).json({ data: notifications });
  }

  async markRead(request: Request, response: Response): Promise<void> {
    const notificationId = request.params.notificationId;
    if (notificationId === undefined || notificationId.trim().length === 0) {
      throw new HttpError(400, "notificationId route parameter is required");
    }
    const notification = await this.notificationService.markRead(requireAuthUser(request).id, notificationId);
    response.status(200).json({ data: notification });
  }
}
