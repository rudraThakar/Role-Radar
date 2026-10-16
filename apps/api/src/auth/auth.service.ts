import { createHash, randomBytes } from "node:crypto";

import argon2 from "argon2";
import jwt from "jsonwebtoken";

import { HttpError } from "../shared/http-error.js";
import type { GoogleLoginInput, LoginInput, RefreshTokenInput, RegisterInput } from "./auth.dto.js";
import type { AuthResult, AuthUser } from "./auth.types.js";
import type { RefreshSessionRepository } from "./refresh-session.repository.js";
import type { UserRepository } from "./user.repository.js";

interface AccessTokenPayload {
  sub: string;
  email: string;
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshSessionRepository: RefreshSessionRepository,
    private readonly jwtSecret: string,
    private readonly googleClientId?: string
  ) {
    if (jwtSecret.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters");
    }
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser !== null) {
      throw new HttpError(409, "Email is already registered");
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id
    });

    const createUserInput: { email: string; passwordHash: string; name?: string } = {
      email: input.email,
      passwordHash
    };

    if (input.name !== undefined) {
      createUserInput.name = input.name;
    }

    const user = await this.userRepository.create(createUserInput);

    return this.buildAuthResult(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(input.email);
    if (user === null) {
      throw new HttpError(401, "Invalid email or password");
    }

    const passwordMatches = await argon2.verify(user.passwordHash, input.password);
    if (!passwordMatches) {
      throw new HttpError(401, "Invalid email or password");
    }

    return this.buildAuthResult(user);
  }

  async loginWithGoogle(input: GoogleLoginInput): Promise<AuthResult> {
    if (this.googleClientId === undefined || this.googleClientId.trim().length === 0) {
      throw new HttpError(503, "Google sign-in is not configured");
    }

    const googleUser = await verifyGoogleIdToken(input.idToken, this.googleClientId);
    const existingUser = await this.userRepository.findByEmail(googleUser.email);
    const createUserInput: { email: string; passwordHash: string; name?: string } = {
      email: googleUser.email,
      passwordHash: await argon2.hash(randomBytes(32).toString("hex"), { type: argon2.argon2id })
    };
    if (googleUser.name !== undefined) {
      createUserInput.name = googleUser.name;
    }

    const user = existingUser === null ? await this.userRepository.create(createUserInput) : existingUser;

    return this.buildAuthResult(user);
  }

  async refresh(input: RefreshTokenInput): Promise<AuthResult> {
    const session = await this.refreshSessionRepository.findByTokenHash(hashToken(input.refreshToken));
    if (session === null || session.revokedAt !== undefined || session.expiresAt.getTime() <= Date.now()) {
      throw new HttpError(401, "Invalid refresh token");
    }

    await this.refreshSessionRepository.revoke(session.id);
    const user = await this.userRepository.findById(session.userId);
    if (user === null) {
      throw new HttpError(401, "Invalid refresh token");
    }

    return this.buildAuthResult(user);
  }

  async logout(input: RefreshTokenInput): Promise<void> {
    const session = await this.refreshSessionRepository.findByTokenHash(hashToken(input.refreshToken));
    if (session !== null) {
      await this.refreshSessionRepository.revoke(session.id);
    }
  }

  async authenticate(accessToken: string): Promise<AuthUser> {
    const payload = verifyAccessToken(accessToken, this.jwtSecret);
    const user = await this.userRepository.findById(payload.sub);
    if (user === null) {
      throw new HttpError(401, "Invalid access token");
    }

    return user;
  }

  private signAccessToken(user: AuthUser): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: "15m"
    });
  }

  private async buildAuthResult(user: AuthUser): Promise<AuthResult> {
    const refreshToken = randomBytes(48).toString("base64url");
    await this.refreshSessionRepository.create(user.id, hashToken(refreshToken), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    return {
      user,
      accessToken: this.signAccessToken(user),
      refreshToken
    };
  }
}

interface GoogleTokenInfo {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
}

interface VerifiedGoogleUser {
  email: string;
  sub: string;
  name?: string;
}

async function verifyGoogleIdToken(idToken: string, googleClientId: string): Promise<VerifiedGoogleUser> {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    throw new HttpError(401, "Invalid Google sign-in token");
  }

  const payload = (await response.json()) as GoogleTokenInfo;
  if (payload.aud !== googleClientId) {
    throw new HttpError(401, "Google token was issued for a different client");
  }

  if (payload.email_verified !== true && payload.email_verified !== "true") {
    throw new HttpError(401, "Google email is not verified");
  }

  if (payload.email === undefined || payload.sub === undefined) {
    throw new HttpError(401, "Google token is missing required identity fields");
  }

  const user: VerifiedGoogleUser = {
    email: payload.email.toLowerCase(),
    sub: payload.sub
  };

  if (payload.name !== undefined && payload.name.trim().length > 0) {
    user.name = payload.name.trim();
  }

  return user;
}

function verifyAccessToken(accessToken: string, jwtSecret: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(accessToken, jwtSecret);
    if (!isAccessTokenPayload(payload)) {
      throw new HttpError(401, "Invalid access token");
    }

    return payload;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(401, "Invalid access token");
  }
}

function isAccessTokenPayload(payload: string | jwt.JwtPayload): payload is AccessTokenPayload {
  return typeof payload !== "string" && typeof payload.sub === "string" && typeof payload.email === "string";
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
