export interface CompanyWatch {
  id: string;
  userId: string;
  profileId: string;
  companyName: string;
  careersUrl: string;
  websiteUrl?: string;
  checkCadenceDays: number;
  lastCheckedAt?: Date;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  lastError?: string;
  consecutiveFailures?: number;
  isActive: boolean;
  createdAt: Date;
}
