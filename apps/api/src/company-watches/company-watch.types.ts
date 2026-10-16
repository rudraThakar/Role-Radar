export interface CompanyWatch {
  id: string;
  userId: string;
  profileId: string;
  companyName: string;
  careersUrl: string;
  websiteUrl?: string;
  checkCadenceDays: number;
  lastCheckedAt?: Date;
  isActive: boolean;
  createdAt: Date;
}
