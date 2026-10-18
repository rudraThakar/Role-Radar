export const eligibilityValues = [
  "ELIGIBLE",
  "POSSIBLY_ELIGIBLE",
  "INELIGIBLE",
  "UNKNOWN"
] as const;

export type Eligibility = (typeof eligibilityValues)[number];

export interface RecommendationExplanation {
  eligibility: Eligibility;
  score: number;
  scoreVersion: string;
  reasons: string[];
  gaps: string[];
  evidence: Record<string, unknown>;
}

