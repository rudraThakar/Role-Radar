import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpError } from "../shared/http-error.js";
import { AuthService } from "./auth.service.js";
import { InMemoryRefreshSessionRepository } from "./refresh-session.repository.js";
import { InMemoryUserRepository } from "./user.repository.js";

const jwtSecret = "test-secret-that-is-long-enough-for-jwt-signing";

describe("auth service", () => {
  it("registers, authenticates, and logs in a user", async () => {
    const service = new AuthService(new InMemoryUserRepository(), new InMemoryRefreshSessionRepository(), jwtSecret);

    const registered = await service.register({
      email: "rudra@example.com",
      password: "password123",
      name: "Rudra"
    });

    assert.equal(registered.user.email, "rudra@example.com");
    assert.equal(typeof registered.accessToken, "string");
    assert.equal(typeof registered.refreshToken, "string");

    const authenticated = await service.authenticate(registered.accessToken);
    assert.equal(authenticated.id, registered.user.id);

    const loggedIn = await service.login({
      email: "rudra@example.com",
      password: "password123"
    });

    assert.equal(loggedIn.user.id, registered.user.id);
  });

  it("refreshes access tokens and rotates refresh sessions", async () => {
    const service = new AuthService(new InMemoryUserRepository(), new InMemoryRefreshSessionRepository(), jwtSecret);
    const registered = await service.register({
      email: "rudra@example.com",
      password: "password123"
    });

    const refreshed = await service.refresh({ refreshToken: registered.refreshToken });

    assert.equal(refreshed.user.id, registered.user.id);
    assert.notEqual(refreshed.refreshToken, registered.refreshToken);
    await assert.rejects(() => service.refresh({ refreshToken: registered.refreshToken }), HttpError);
  });

  it("rejects duplicate registration and bad credentials", async () => {
    const service = new AuthService(new InMemoryUserRepository(), new InMemoryRefreshSessionRepository(), jwtSecret);

    await service.register({
      email: "rudra@example.com",
      password: "password123"
    });

    await assert.rejects(
      () =>
        service.register({
          email: "rudra@example.com",
          password: "password123"
        }),
      HttpError
    );

    await assert.rejects(
      () =>
        service.login({
          email: "rudra@example.com",
          password: "wrong-password"
        }),
      HttpError
    );
  });

  it("rejects Google login when Google client id is not configured", async () => {
    const service = new AuthService(new InMemoryUserRepository(), new InMemoryRefreshSessionRepository(), jwtSecret);

    await assert.rejects(
      () =>
        service.loginWithGoogle({
          idToken: "google-id-token"
        }),
      HttpError
    );
  });
});
