export function validateRuntimeEnvironment(environment: NodeJS.ProcessEnv): void {
  const databaseUrl = required(environment, "DATABASE_URL");
  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string");
  }

  requireMinimumLength(environment, "JWT_SECRET", 32);
  requireMinimumLength(environment, "CRON_SECRET", 32);

  const supabaseUrl = parseUrl(required(environment, "SUPABASE_URL"), "SUPABASE_URL");
  if (supabaseUrl.protocol !== "https:" && environment.NODE_ENV === "production") {
    throw new Error("SUPABASE_URL must use HTTPS in production");
  }

  const supabaseSecretKey = required(environment, "SUPABASE_SECRET_KEY");
  if (environment.NODE_ENV === "production" && !supabaseSecretKey.startsWith("sb_secret_")) {
    throw new Error("SUPABASE_SECRET_KEY must use the sb_secret_ format in production");
  }
  required(environment, "SUPABASE_RESUME_BUCKET");

  const allowedOrigins = required(environment, "CORS_ORIGIN")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter((origin) => origin.length > 0);
  if (allowedOrigins.includes("*")) {
    throw new Error("CORS_ORIGIN must list explicit frontend origins");
  }
  for (const origin of allowedOrigins) {
    const parsedOrigin = parseUrl(origin, "CORS_ORIGIN");
    if (parsedOrigin.protocol !== "http:" && parsedOrigin.protocol !== "https:") {
      throw new Error("CORS_ORIGIN entries must use HTTP or HTTPS");
    }
  }

  const port = Number(environment.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
}

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} environment variable is required`);
  }
  return value.trim();
}

function requireMinimumLength(environment: NodeJS.ProcessEnv, name: string, minimumLength: number): void {
  if (required(environment, name).length < minimumLength) {
    throw new Error(`${name} must contain at least ${minimumLength} characters`);
  }
}

function parseUrl(value: string, name: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
}
