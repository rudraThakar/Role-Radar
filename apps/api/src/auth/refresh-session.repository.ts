import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

export interface RefreshSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}

export interface RefreshSessionRepository {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshSession>;
  findByTokenHash(tokenHash: string): Promise<RefreshSession | null>;
  revoke(sessionId: string): Promise<void>;
}

export class InMemoryRefreshSessionRepository implements RefreshSessionRepository {
  private readonly sessions = new Map<string, RefreshSession>();

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshSession> {
    const session: RefreshSession = {
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      createdAt: new Date()
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshSession | null> {
    return [...this.sessions.values()].find((session) => session.tokenHash === tokenHash) ?? null;
  }

  async revoke(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session !== undefined) {
      this.sessions.set(sessionId, { ...session, revokedAt: new Date() });
    }
  }
}

export class PrismaRefreshSessionRepository implements RefreshSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshSession> {
    const id = randomUUID();
    const rows = await this.prisma.$queryRaw<RefreshSessionRow[]>`
      INSERT INTO "RefreshSession" ("id", "userId", "tokenHash", "expiresAt")
      VALUES (${id}, ${userId}, ${tokenHash}, ${expiresAt})
      RETURNING "id", "userId", "tokenHash", "expiresAt", "revokedAt", "createdAt"
    `;

    return toRefreshSession(rows[0]);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshSession | null> {
    const rows = await this.prisma.$queryRaw<RefreshSessionRow[]>`
      SELECT "id", "userId", "tokenHash", "expiresAt", "revokedAt", "createdAt"
      FROM "RefreshSession"
      WHERE "tokenHash" = ${tokenHash}
      LIMIT 1
    `;

    return rows[0] === undefined ? null : toRefreshSession(rows[0]);
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "RefreshSession"
      SET "revokedAt" = NOW()
      WHERE "id" = ${sessionId}
    `;
  }
}

interface RefreshSessionRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

function toRefreshSession(row: RefreshSessionRow | undefined): RefreshSession {
  if (row === undefined) {
    throw new Error("Refresh session row was not returned");
  }

  const session: RefreshSession = {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt
  };

  if (row.revokedAt !== null) {
    session.revokedAt = row.revokedAt;
  }

  return session;
}
