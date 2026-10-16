import { HttpError } from "../shared/http-error.js";

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleLoginInput {
  idToken: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export function parseRegisterInput(body: unknown): RegisterInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  const input: RegisterInput = {
    email: requiredEmail(body.email),
    password: requiredPassword(body.password)
  };

  if (body.name !== undefined) {
    input.name = requiredString(body.name, "name");
  }

  return input;
}

export function parseLoginInput(body: unknown): LoginInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  return {
    email: requiredEmail(body.email),
    password: requiredString(body.password, "password")
  };
}

export function parseGoogleLoginInput(body: unknown): GoogleLoginInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  return {
    idToken: requiredString(body.idToken, "idToken")
  };
}

export function parseRefreshTokenInput(body: unknown): RefreshTokenInput {
  if (!isRecord(body)) {
    throw new HttpError(400, "Request body must be an object");
  }

  return {
    refreshToken: requiredString(body.refreshToken, "refreshToken")
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

function requiredEmail(value: unknown): string {
  const email = requiredString(value, "email").toLowerCase();
  if (!email.includes("@")) {
    throw new HttpError(400, "email must be valid");
  }

  return email;
}

function requiredPassword(value: unknown): string {
  const password = requiredString(value, "password");
  if (password.length < 8) {
    throw new HttpError(400, "password must be at least 8 characters");
  }

  return password;
}
