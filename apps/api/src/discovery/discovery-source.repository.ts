import { randomUUID } from "node:crypto";

import type { CompanyStage, ProfileDomain } from "@roleradar/domain";
import { Prisma, type PrismaClient } from "@prisma/client";

import type { DiscoveryProvider, DiscoverySource } from "./source-registry.js";

export interface DiscoveryRunMetrics {
  fetched: number;
  normalized: number;
  created: number;
  updated: number;
  failed: number;
  error?: string;
}

export interface DiscoverySourceRepository {
  ensureSources(sources: DiscoverySource[]): Promise<void>;
  findActive(): Promise<DiscoverySource[]>;
  recordRun(sourceId: string, startedAt: Date, completedAt: Date, metrics: DiscoveryRunMetrics): Promise<void>;
}

export class InMemoryDiscoverySourceRepository implements DiscoverySourceRepository {
  private readonly sources = new Map<string, DiscoverySource>();
  readonly runs: Array<DiscoveryRunMetrics & { sourceId: string; startedAt: Date; completedAt: Date }> = [];

  constructor(sources: DiscoverySource[] = []) {
    for (const source of sources) this.sources.set(source.id, source);
  }

  async ensureSources(sources: DiscoverySource[]): Promise<void> {
    for (const source of sources) {
      if (!this.sources.has(source.id)) this.sources.set(source.id, source);
    }
  }

  async findActive(): Promise<DiscoverySource[]> {
    return [...this.sources.values()];
  }

  async recordRun(
    sourceId: string,
    startedAt: Date,
    completedAt: Date,
    metrics: DiscoveryRunMetrics
  ): Promise<void> {
    this.runs.push({ sourceId, startedAt, completedAt, ...metrics });
  }
}

export class PrismaDiscoverySourceRepository implements DiscoverySourceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async ensureSources(sources: DiscoverySource[]): Promise<void> {
    for (const source of sources) {
      await this.prisma.$executeRaw`
        INSERT INTO "JobDiscoverySource" (
          "id", "companyName", "careersUrl", "provider", "domains", "locations", "roleKeywords", "stage", "updatedAt"
        ) VALUES (
          ${source.id}, ${source.companyName}, ${source.careersUrl}, ${source.provider},
          ${profileDomainArray(source.domains)},
          ${textArray(source.locations)},
          ${textArray(source.roleKeywords)},
          ${source.stage ?? null},
          NOW()
        )
        ON CONFLICT ("id") DO UPDATE SET
          "companyName" = EXCLUDED."companyName",
          "careersUrl" = EXCLUDED."careersUrl",
          "provider" = EXCLUDED."provider",
          "domains" = EXCLUDED."domains",
          "locations" = EXCLUDED."locations",
          "roleKeywords" = EXCLUDED."roleKeywords",
          "stage" = EXCLUDED."stage",
          "updatedAt" = NOW()
      `;
    }
  }

  async findActive(): Promise<DiscoverySource[]> {
    const sources = await this.prisma.$queryRaw<DiscoverySourceRow[]>`
      SELECT "id", "companyName", "careersUrl", "provider", "domains", "locations", "roleKeywords", "stage"
      FROM "JobDiscoverySource"
      WHERE "isActive" = true
      ORDER BY "provider" ASC, "companyName" ASC
    `;

    return sources.map((source) => ({
      id: source.id,
      companyName: source.companyName,
      careersUrl: source.careersUrl,
      provider: source.provider as DiscoveryProvider,
      domains: source.domains as ProfileDomain[],
      locations: source.locations,
      roleKeywords: source.roleKeywords,
      ...(source.stage === null ? {} : { stage: source.stage as CompanyStage })
    }));
  }

  async recordRun(
    sourceId: string,
    startedAt: Date,
    completedAt: Date,
    metrics: DiscoveryRunMetrics
  ): Promise<void> {
    const succeeded = metrics.error === undefined;
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        INSERT INTO "JobDiscoveryRun" (
          "id", "sourceId", "status", "fetched", "normalized", "created", "updated", "failed", "error", "startedAt", "completedAt"
        ) VALUES (
          ${randomUUID()}, ${sourceId}, ${succeeded ? "SUCCEEDED" : "FAILED"}, ${metrics.fetched},
          ${metrics.normalized}, ${metrics.created}, ${metrics.updated}, ${metrics.failed},
          ${metrics.error ?? null}, ${startedAt}, ${completedAt}
        )
      `;

      if (succeeded) {
        await transaction.$executeRaw`
          UPDATE "JobDiscoverySource" SET
            "lastCheckedAt" = ${completedAt}, "lastSuccessAt" = ${completedAt},
            "lastError" = NULL, "consecutiveFailures" = 0, "updatedAt" = NOW()
          WHERE "id" = ${sourceId}
        `;
      } else {
        await transaction.$executeRaw`
          UPDATE "JobDiscoverySource" SET
            "lastCheckedAt" = ${completedAt}, "lastFailureAt" = ${completedAt},
            "lastError" = ${metrics.error ?? "Unknown discovery error"},
            "consecutiveFailures" = "consecutiveFailures" + 1, "updatedAt" = NOW()
          WHERE "id" = ${sourceId}
        `;
      }
    });
  }
}

interface DiscoverySourceRow {
  id: string;
  companyName: string;
  careersUrl: string;
  provider: string;
  domains: string[];
  locations: string[];
  roleKeywords: string[];
  stage: string | null;
}

function textArray(values: string[]): Prisma.Sql {
  return values.length === 0 ? Prisma.sql`ARRAY[]::TEXT[]` : Prisma.sql`ARRAY[${Prisma.join(values)}]::TEXT[]`;
}

function profileDomainArray(values: ProfileDomain[]): Prisma.Sql {
  return values.length === 0
    ? Prisma.sql`ARRAY[]::"ProfileDomain"[]`
    : Prisma.sql`ARRAY[${Prisma.join(values)}]::"ProfileDomain"[]`;
}
