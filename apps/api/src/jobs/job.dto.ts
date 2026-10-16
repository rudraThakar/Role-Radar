import { employmentTypes, profileDomains, seniorityLevels, workModes, type CanonicalJob } from "@roleradar/domain";

import { HttpError } from "../shared/http-error.js";

export type CreateJobInput = Omit<CanonicalJob, "id" | "evidence">;

export function parseCreateJobInput(body: unknown): CreateJobInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  const input: CreateJobInput = {
    companyName: requiredString(body.companyName, "companyName"),
    title: requiredString(body.title, "title"),
    normalizedTitle:
      body.normalizedTitle === undefined
        ? normalizeTitle(requiredString(body.title, "title"))
        : requiredString(body.normalizedTitle, "normalizedTitle"),
    description: requiredString(body.description, "description"),
    employmentType: requiredEnum(body.employmentType, employmentTypes, "employmentType"),
    seniority: requiredEnum(body.seniority, seniorityLevels, "seniority"),
    domains: requiredEnumArray(body.domains, profileDomains, "domains"),
    skills: optionalStringArray(body.skills, "skills"),
    locations: optionalStringArray(body.locations, "locations"),
    workMode: requiredEnum(body.workMode, workModes, "workMode"),
    sourceUrl: requiredUrl(body.sourceUrl, "sourceUrl"),
    applyUrl: requiredUrl(body.applyUrl, "applyUrl"),
    discoveredAt: optionalDate(body.discoveredAt, "discoveredAt") ?? new Date()
  };

  if (body.minimumExperienceMonths !== undefined) {
    input.minimumExperienceMonths = requiredNonNegativeInteger(body.minimumExperienceMonths, "minimumExperienceMonths");
  }
  if (body.maximumExperienceMonths !== undefined) {
    input.maximumExperienceMonths = requiredNonNegativeInteger(body.maximumExperienceMonths, "maximumExperienceMonths");
  }
  if (body.eligibleGraduationYears !== undefined) {
    input.eligibleGraduationYears = requiredIntegerArray(body.eligibleGraduationYears, "eligibleGraduationYears");
  }
  if (body.salaryMin !== undefined) input.salaryMin = requiredNonNegativeInteger(body.salaryMin, "salaryMin");
  if (body.salaryMax !== undefined) input.salaryMax = requiredNonNegativeInteger(body.salaryMax, "salaryMax");
  if (body.salaryCurrency !== undefined) input.salaryCurrency = requiredString(body.salaryCurrency, "salaryCurrency");
  if (body.publishedAt !== undefined) input.publishedAt = requiredDate(body.publishedAt, "publishedAt");
  if (body.expiresAt !== undefined) input.expiresAt = requiredDate(body.expiresAt, "expiresAt");

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

function requiredEnum<TValue extends string>(value: unknown, allowedValues: readonly TValue[], fieldName: string): TValue {
  if (typeof value !== "string" || !allowedValues.includes(value as TValue)) {
    throw new HttpError(400, `${fieldName} must be one of: ${allowedValues.join(", ")}`);
  }

  return value as TValue;
}

function requiredEnumArray<TValue extends string>(value: unknown, allowedValues: readonly TValue[], fieldName: string): TValue[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, `${fieldName} must be a non-empty array`);
  }

  return value.map((item) => requiredEnum(item, allowedValues, fieldName));
}

function optionalStringArray(value: unknown, fieldName: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new HttpError(400, `${fieldName} must be an array of strings`);
  }

  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}

function requiredIntegerArray(value: unknown, fieldName: string): number[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "number" && Number.isInteger(item))) {
    throw new HttpError(400, `${fieldName} must be an array of integers`);
  }

  return value;
}

function requiredNonNegativeInteger(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new HttpError(400, `${fieldName} must be a non-negative integer`);
  }

  return value;
}

function optionalDate(value: unknown, fieldName: string): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requiredDate(value, fieldName);
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

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

