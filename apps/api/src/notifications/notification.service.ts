import { HttpError } from "../shared/http-error.js";
import type { NotificationRepository } from "./notification.repository.js";
import type { UserNotification } from "./notification.types.js";

export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async list(userId: string): Promise<UserNotification[]> {
    return this.notificationRepository.listForUser(userId);
  }

  async markRead(userId: string, notificationId: string): Promise<UserNotification> {
    const notification = await this.notificationRepository.markRead(userId, notificationId);
    if (notification === null) throw new HttpError(404, "Notification not found");
    return notification;
  }
}
