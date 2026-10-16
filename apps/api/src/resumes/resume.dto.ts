import { HttpError } from "../shared/http-error.js";

export interface CreateResumeInput {
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey?: string;
  checksumSha256?: string;
  extractedText?: string;
  extractionError?: string;
  extractionStatus?: "PENDING" | "COMPLETED" | "FAILED";
}

export function parseCreateResumeInput(body: unknown): CreateResumeInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  return {
    originalFilename: requiredString(body.originalFilename, "originalFilename"),
    mimeType: requiredString(body.mimeType, "mimeType"),
    sizeBytes: requiredPositiveInteger(body.sizeBytes, "sizeBytes")
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, `${fieldName} must be a non-empty string`);
  }

  return value.trim();
}

function requiredPositiveInteger(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive integer`);
  }

  return value;
}
