import type { Request, RequestHandler } from "express";

import { HttpError } from "../shared/http-error.js";
import type { AuthService } from "./auth.service.js";
import type { AuthUser } from "./auth.types.js";

export interface AuthenticatedRequest {
  auth?: {
    user: AuthUser;
  };
}

export function createAuthMiddleware(authService: AuthService): RequestHandler {
  return async (request, _response, next) => {
    try {
      const authorization = request.header("authorization");
      if (authorization === undefined || !authorization.startsWith("Bearer ")) {
        throw new HttpError(401, "Bearer access token is required");
      }

      const accessToken = authorization.slice("Bearer ".length);
      const user = await authService.authenticate(accessToken);
      (request as AuthenticatedRequest).auth = { user };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAuthUser(request: Request): AuthUser {
  const authenticatedRequest = request as AuthenticatedRequest;
  if (authenticatedRequest.auth === undefined) {
    throw new HttpError(401, "Authentication is required");
  }

  return authenticatedRequest.auth.user;
}
