export const resumeExtractionStatuses = ["PENDING", "COMPLETED", "FAILED"] as const;

export type ResumeExtractionStatus = (typeof resumeExtractionStatuses)[number];

export interface Resume {
  id: string;
  profileId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey?: string;
  checksumSha256?: string;
  extractedText?: string;
  extractionError?: string;
  extractionStatus: ResumeExtractionStatus;
  isActive: boolean;
  createdAt: Date;
}
