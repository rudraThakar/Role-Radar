import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import type { UserNotification } from "./notification.types.js";

export interface NotificationRepository {
  create(input: Omit<UserNotification, "id" | "createdAt" | "readAt">): Promise<UserNotification>;
  listForUser(userId: string): Promise<UserNotification[]>;
  markRead(userId: string, notificationId: string): Promise<UserNotification | null>;
}

export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly notifications = new Map<string, UserNotification>();

  async create(input: Omit<UserNotification, "id" | "createdAt" | "readAt">): Promise<UserNotification> {
    const notification: UserNotification = { id: randomUUID(), createdAt: new Date(), ...input };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async listForUser(userId: string): Promise<UserNotification[]> {
    return [...this.notifications.values()]
      .filter((notification) => notification.userId === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async markRead(userId: string, notificationId: string): Promise<UserNotification | null> {
    const notification = this.notifications.get(notificationId);
    if (notification === undefined || notification.userId !== userId) return null;
    const updated = { ...notification, readAt: notification.readAt ?? new Date() };
    this.notifications.set(updated.id, updated);
    return updated;
  }
}

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: Omit<UserNotification, "id" | "createdAt" | "readAt">): Promise<UserNotification> {
    return toNotification(await this.prisma.userNotification.create({ data: input }));
  }

  async listForUser(userId: string): Promise<UserNotification[]> {
    const notifications = await this.prisma.userNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return notifications.map(toNotification);
  }

  async markRead(userId: string, notificationId: string): Promise<UserNotification | null> {
    const notification = await this.prisma.userNotification.findFirst({ where: { id: notificationId, userId } });
    if (notification === null) return null;
    return toNotification(
      await this.prisma.userNotification.update({
        where: { id: notificationId },
        data: { readAt: notification.readAt ?? new Date() }
      })
    );
  }
}

type PrismaNotification = Awaited<ReturnType<PrismaClient["userNotification"]["findUnique"]>>;

function toNotification(notification: NonNullable<PrismaNotification>): UserNotification {
  const result: UserNotification = {
    id: notification.id,
    userId: notification.userId,
    profileId: notification.profileId,
    type: "NEW_MATCHES",
    message: notification.message,
    jobCount: notification.jobCount,
    createdAt: notification.createdAt
  };
  if (notification.readAt !== null) result.readAt = notification.readAt;
  return result;
}
