import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateRuntimeEnvironment } from "./runtime-config.js";

const validEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:password@database.example.com:5432/postgres",
  JWT_SECRET: "jwt-secret-that-is-at-least-32-characters",
  CRON_SECRET: "cron-secret-that-is-at-least-32-characters",
  CORS_ORIGIN: "https://roleradar.example.com",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_backend-only-key",
  SUPABASE_RESUME_BUCKET: "resumes",
  PORT: "3000"
};

describe("runtime configuration", () => {
  it("accepts a complete production configuration", () => {
    assert.doesNotThrow(() => validateRuntimeEnvironment(validEnvironment));
  });

  it("rejects wildcard CORS and weak secrets", () => {
    assert.throws(
      () => validateRuntimeEnvironment({ ...validEnvironment, CORS_ORIGIN: "*" }),
      /explicit frontend origins/
    );
    assert.throws(
      () => validateRuntimeEnvironment({ ...validEnvironment, JWT_SECRET: "too-short" }),
      /at least 32 characters/
    );
  });

  it("requires the production Supabase secret-key format", () => {
    assert.throws(
      () => validateRuntimeEnvironment({ ...validEnvironment, SUPABASE_SECRET_KEY: "legacy-key" }),
      /sb_secret_/
    );
  });
});
