import type { CareerProfile, EmploymentType, ProfileDomain, WorkMode } from "@roleradar/domain";

import { employmentTypes, profileDomains, workModes } from "@roleradar/domain";
import { HttpError } from "../shared/http-error.js";

export type CreateProfileInput = Omit<CareerProfile, "id">;
export type UpdateProfileInput = Partial<CreateProfileInput>;

export function parseCreateProfileInput(body: unknown): CreateProfileInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  const input: CreateProfileInput = {
    name: requiredString(body.name, "name"),
    domain: requiredEnum(body.domain, profileDomains, "domain"),
    experienceMonths: requiredNonNegativeInteger(body.experienceMonths, "experienceMonths"),
    preferredRoles: optionalStringArray(body.preferredRoles, "preferredRoles"),
    preferredLocations: optionalStringArray(body.preferredLocations, "preferredLocations"),
    preferredWorkModes: optionalEnumArray(body.preferredWorkModes, workModes, "preferredWorkModes"),
    citizenshipCountry: optionalCountry(body.citizenshipCountry),
    includeInternationalRoles: optionalBoolean(body.includeInternationalRoles, false, "includeInternationalRoles"),
    targetCompanies: optionalStringArray(body.targetCompanies, "targetCompanies"),
    excludedCompanies: optionalStringArray(body.excludedCompanies, "excludedCompanies"),
    includedKeywords: optionalStringArray(body.includedKeywords, "includedKeywords"),
    excludedKeywords: optionalStringArray(body.excludedKeywords, "excludedKeywords"),
    skills: optionalStringArray(body.skills, "skills"),
    seeksEmploymentTypes: optionalEnumArray(body.seeksEmploymentTypes, employmentTypes, "seeksEmploymentTypes")
  };

  if (body.graduationYear !== undefined) {
    input.graduationYear = requiredIntegerInRange(body.graduationYear, "graduationYear", 1950, 2100);
  }

  if (body.minimumSalary !== undefined) {
    input.minimumSalary = requiredNonNegativeInteger(body.minimumSalary, "minimumSalary");
  }

  if (body.salaryCurrency !== undefined) {
    input.salaryCurrency = requiredString(body.salaryCurrency, "salaryCurrency");
  }

  return input;
}

export function parseUpdateProfileInput(body: unknown): UpdateProfileInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  const input: UpdateProfileInput = {};

  if (body.name !== undefined) input.name = requiredString(body.name, "name");
  if (body.domain !== undefined) input.domain = requiredEnum(body.domain, profileDomains, "domain");
  if (body.experienceMonths !== undefined) {
    input.experienceMonths = requiredNonNegativeInteger(body.experienceMonths, "experienceMonths");
  }
  if (body.graduationYear !== undefined) {
    input.graduationYear = requiredIntegerInRange(body.graduationYear, "graduationYear", 1950, 2100);
  }
  if (body.preferredRoles !== undefined) input.preferredRoles = optionalStringArray(body.preferredRoles, "preferredRoles");
  if (body.preferredLocations !== undefined) {
    input.preferredLocations = optionalStringArray(body.preferredLocations, "preferredLocations");
  }
  if (body.preferredWorkModes !== undefined) {
    input.preferredWorkModes = optionalEnumArray(body.preferredWorkModes, workModes, "preferredWorkModes");
  }
  if (body.citizenshipCountry !== undefined) input.citizenshipCountry = requiredString(body.citizenshipCountry, "citizenshipCountry");
  if (body.includeInternationalRoles !== undefined) {
    input.includeInternationalRoles = optionalBoolean(body.includeInternationalRoles, false, "includeInternationalRoles");
  }
  if (body.minimumSalary !== undefined) {
    input.minimumSalary = requiredNonNegativeInteger(body.minimumSalary, "minimumSalary");
  }
  if (body.salaryCurrency !== undefined) input.salaryCurrency = requiredString(body.salaryCurrency, "salaryCurrency");
  if (body.targetCompanies !== undefined) {
    input.targetCompanies = optionalStringArray(body.targetCompanies, "targetCompanies");
  }
  if (body.excludedCompanies !== undefined) {
    input.excludedCompanies = optionalStringArray(body.excludedCompanies, "excludedCompanies");
  }
  if (body.includedKeywords !== undefined) {
    input.includedKeywords = optionalStringArray(body.includedKeywords, "includedKeywords");
  }
  if (body.excludedKeywords !== undefined) {
    input.excludedKeywords = optionalStringArray(body.excludedKeywords, "excludedKeywords");
  }
  if (body.skills !== undefined) input.skills = optionalStringArray(body.skills, "skills");
  if (body.seeksEmploymentTypes !== undefined) {
    input.seeksEmploymentTypes = optionalEnumArray(body.seeksEmploymentTypes, employmentTypes, "seeksEmploymentTypes");
  }

  if (Object.keys(input).length === 0) {
    throw new HttpError(400, "At least one profile field must be provided");
  }

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

function requiredNonNegativeInteger(value: unknown, fieldName: string): number {
  return requiredIntegerInRange(value, fieldName, 0, Number.MAX_SAFE_INTEGER);
}

function requiredIntegerInRange(value: unknown, fieldName: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new HttpError(400, `${fieldName} must be an integer between ${min} and ${max}`);
  }

  return value;
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

function optionalCountry(value: unknown): string {
  if (value === undefined) {
    return "India";
  }

  return requiredString(value, "citizenshipCountry");
}

function optionalBoolean(value: unknown, defaultValue: boolean, fieldName: string): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== "boolean") {
    throw new HttpError(400, `${fieldName} must be a boolean`);
  }

  return value;
}

function requiredEnum<TValue extends string>(value: unknown, allowedValues: readonly TValue[], fieldName: string): TValue {
  if (typeof value !== "string" || !allowedValues.includes(value as TValue)) {
    throw new HttpError(400, `${fieldName} must be one of: ${allowedValues.join(", ")}`);
  }

  return value as TValue;
}

function optionalEnumArray<TValue extends string>(value: unknown, allowedValues: readonly TValue[], fieldName: string): TValue[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new HttpError(400, `${fieldName} must be an array`);
  }

  return value.map((item) => requiredEnum(item, allowedValues, fieldName));
}

export type { CareerProfile, EmploymentType, ProfileDomain, WorkMode };
