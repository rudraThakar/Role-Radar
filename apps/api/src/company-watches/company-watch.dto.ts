import { HttpError } from "../shared/http-error.js";

export interface CreateCompanyWatchInput {
  companyName: string;
  careersUrl: string;
  websiteUrl?: string;
  checkCadenceDays: number;
}

export interface BulkCreateCompanyWatchesInput {
  watches: CreateCompanyWatchInput[];
}

export function parseCreateCompanyWatchInput(body: unknown): CreateCompanyWatchInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  const input: CreateCompanyWatchInput = {
    companyName: requiredString(body.companyName, "companyName"),
    careersUrl: requiredUrl(body.careersUrl, "careersUrl"),
    checkCadenceDays:
      body.checkCadenceDays === undefined ? 1 : requiredIntegerInRange(body.checkCadenceDays, "checkCadenceDays", 1, 30)
  };

  if (body.websiteUrl !== undefined) {
    input.websiteUrl = requiredUrl(body.websiteUrl, "websiteUrl");
  }

  return input;
}

export function parseBulkCreateCompanyWatchesInput(body: unknown): BulkCreateCompanyWatchesInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  if (!Array.isArray(body.watches) || body.watches.length === 0) {
    throw new HttpError(400, "watches must be a non-empty array");
  }

  if (body.watches.length > 250) {
    throw new HttpError(400, "A maximum of 250 watches can be imported at once");
  }

  return {
    watches: body.watches.map(parseCreateCompanyWatchInput)
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

function requiredUrl(value: unknown, fieldName: string): string {
  const url = requiredString(value, fieldName);
  try {
    new URL(url);
  } catch {
    throw new HttpError(400, `${fieldName} must be a valid URL`);
  }

  return url;
}

function requiredIntegerInRange(value: unknown, fieldName: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new HttpError(400, `${fieldName} must be an integer between ${min} and ${max}`);
  }

  return value;
}
