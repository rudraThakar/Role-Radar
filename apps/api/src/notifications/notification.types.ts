export interface UserNotification {
  id: string;
  userId: string;
  profileId: string;
  type: "NEW_MATCHES";
  message: string;
  jobCount: number;
  readAt?: Date;
  createdAt: Date;
}
