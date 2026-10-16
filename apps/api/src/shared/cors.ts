import type { RequestHandler } from "express";

const allowedMethods = "GET,POST,PATCH,DELETE,OPTIONS";
const allowedHeaders = "Content-Type,Authorization";

export function createCorsMiddleware(rawAllowedOrigins: string | undefined): RequestHandler {
  const allowedOrigins = parseAllowedOrigins(rawAllowedOrigins);

  return (request, response, next) => {
    const requestOrigin = request.header("origin");
    const allowedOrigin = resolveAllowedOrigin(requestOrigin, allowedOrigins);

    if (allowedOrigin !== undefined) {
      response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Methods", allowedMethods);
      response.setHeader("Access-Control-Allow-Headers", allowedHeaders);
      response.setHeader("Access-Control-Max-Age", "86400");
    }

    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }

    next();
  };
}

function parseAllowedOrigins(rawAllowedOrigins: string | undefined): string[] {
  if (rawAllowedOrigins === undefined || rawAllowedOrigins.trim().length === 0) {
    return [];
  }

  return rawAllowedOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function resolveAllowedOrigin(requestOrigin: string | undefined, allowedOrigins: string[]): string | undefined {
  if (requestOrigin === undefined || allowedOrigins.length === 0) {
    return undefined;
  }

  if (allowedOrigins.includes("*")) {
    return "*";
  }

  return allowedOrigins.includes(requestOrigin) ? requestOrigin : undefined;
}
