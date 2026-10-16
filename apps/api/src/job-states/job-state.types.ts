export const jobStateValues = ["SAVED", "HIDDEN", "VIEWED", "APPLIED"] as const;
export const applicationStageValues = ["APPLIED", "INTERVIEWING", "OFFER", "REJECTED", "WITHDRAWN"] as const;

export type JobStateValue = (typeof jobStateValues)[number];
export type ApplicationStageValue = (typeof applicationStageValues)[number];

export interface UserJobState {
  userId: string;
  profileId: string;
  jobId: string;
  state: JobStateValue;
  applicationStage?: ApplicationStageValue;
  applicationNotes?: string;
  appliedAt?: Date;
}
