import { Router, type RequestHandler } from "express";

import { asyncHandler } from "../shared/async-handler.js";
import { AuthController } from "./auth.controller.js";
import type { AuthService } from "./auth.service.js";

export function createAuthRouter(authService: AuthService, authenticate: RequestHandler): Router {
  const router = Router();
  const controller = new AuthController(authService);

  router.post("/register", asyncHandler(controller.register.bind(controller)));
  router.post("/login", asyncHandler(controller.login.bind(controller)));
  router.post("/google", asyncHandler(controller.googleLogin.bind(controller)));
  router.post("/refresh", asyncHandler(controller.refresh.bind(controller)));
  router.post("/logout", asyncHandler(controller.logout.bind(controller)));
  router.get("/me", authenticate, asyncHandler(controller.me.bind(controller)));

  return router;
}
