import { HttpError } from "../shared/http-error.js";

export interface RawJobPostingInput {
  companyName: string;
  title: string;
  description: string;
  sourceUrl: string;
  applyUrl?: string;
  locations?: string[];
  skills?: string[];
  publishedAt?: Date;
}

export interface ImportJobsInput {
  jobs: RawJobPostingInput[];
}

export function parseImportJobsInput(body: unknown): ImportJobsInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  if (!Array.isArray(body.jobs) || body.jobs.length === 0) {
    throw new HttpError(400, "jobs must be a non-empty array");
  }

  return {
    jobs: body.jobs.map(parseRawJobPostingInput)
  };
}

function parseRawJobPostingInput(value: unknown): RawJobPostingInput {
  if (!isRecord(value)) {
    throw new HttpError(400, "Each job must be an object");
  }

  const input: RawJobPostingInput = {
    companyName: requiredString(value.companyName, "companyName"),
    title: requiredString(value.title, "title"),
    description: requiredString(value.description, "description"),
    sourceUrl: requiredUrl(value.sourceUrl, "sourceUrl")
  };

  if (value.applyUrl !== undefined) input.applyUrl = requiredUrl(value.applyUrl, "applyUrl");
  if (value.locations !== undefined) input.locations = optionalStringArray(value.locations, "locations");
  if (value.skills !== undefined) input.skills = optionalStringArray(value.skills, "skills");
  if (value.publishedAt !== undefined) input.publishedAt = requiredDate(value.publishedAt, "publishedAt");

  return input;
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

function optionalStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new HttpError(400, `${fieldName} must be an array of strings`);
  }

  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}

function requiredDate(value: unknown, fieldName: string): Date {
  if (typeof value !== "string") {
    throw new HttpError(400, `${fieldName} must be an ISO date string`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${fieldName} must be a valid ISO date string`);
  }

  return date;
}
