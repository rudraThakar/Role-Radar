import type { Request, Response } from "express";

import { requireAuthUser } from "./auth.middleware.js";
import { parseGoogleLoginInput, parseLoginInput, parseRefreshTokenInput, parseRegisterInput } from "./auth.dto.js";
import type { AuthService } from "./auth.service.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(request: Request, response: Response): Promise<void> {
    const result = await this.authService.register(parseRegisterInput(request.body));
    response.status(201).json({ data: result });
  }

  async login(request: Request, response: Response): Promise<void> {
    const result = await this.authService.login(parseLoginInput(request.body));
    response.status(200).json({ data: result });
  }

  async googleLogin(request: Request, response: Response): Promise<void> {
    const result = await this.authService.loginWithGoogle(parseGoogleLoginInput(request.body));
    response.status(200).json({ data: result });
  }

  async refresh(request: Request, response: Response): Promise<void> {
    const result = await this.authService.refresh(parseRefreshTokenInput(request.body));
    response.status(200).json({ data: result });
  }

  async logout(request: Request, response: Response): Promise<void> {
    await this.authService.logout(parseRefreshTokenInput(request.body));
    response.status(204).send();
  }

  async me(request: Request, response: Response): Promise<void> {
    response.status(200).json({ data: requireAuthUser(request) });
  }
}
