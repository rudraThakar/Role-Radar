import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import type { AuthUser } from "./auth.types.js";

export interface StoredUser extends AuthUser {
  passwordHash: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<StoredUser | null>;
  findById(userId: string): Promise<AuthUser | null>;
  create(input: { email: string; passwordHash: string; name?: string }): Promise<AuthUser>;
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, StoredUser>();

  async findByEmail(email: string): Promise<StoredUser | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async findById(userId: string): Promise<AuthUser | null> {
    const user = this.users.get(userId);
    return user === undefined ? null : toAuthUser(user);
  }

  async create(input: { email: string; passwordHash: string; name?: string }): Promise<AuthUser> {
    const user: StoredUser = {
      id: randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash
    };

    if (input.name !== undefined) {
      user.name = input.name;
    }

    this.users.set(user.id, user);
    return toAuthUser(user);
  }
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<StoredUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    return user === null ? null : toStoredUser(user);
  }

  async findById(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    return user === null ? null : toAuthUser(toStoredUser(user));
  }

  async create(input: { email: string; passwordHash: string; name?: string }): Promise<AuthUser> {
    const user = await this.prisma.user.create({
      data: input
    });

    return toAuthUser(toStoredUser(user));
  }
}

function toStoredUser(user: { id: string; email: string; passwordHash: string; name: string | null }): StoredUser {
  const storedUser: StoredUser = {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash
  };

  if (user.name !== null) {
    storedUser.name = user.name;
  }

  return storedUser;
}

function toAuthUser(user: StoredUser): AuthUser {
  const authUser: AuthUser = {
    id: user.id,
    email: user.email
  };

  if (user.name !== undefined) {
    authUser.name = user.name;
  }

  return authUser;
}
