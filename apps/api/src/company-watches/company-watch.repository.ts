import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import type { CreateCompanyWatchInput } from "./company-watch.dto.js";
import type { CompanyWatch } from "./company-watch.types.js";

export interface CompanyWatchRepository {
  findActive(): Promise<CompanyWatch[]>;
  findForProfile(userId: string, profileId: string): Promise<CompanyWatch[]>;
  create(userId: string, profileId: string, input: CreateCompanyWatchInput): Promise<CompanyWatch>;
  delete(userId: string, profileId: string, watchId: string): Promise<boolean>;
  markChecked(userId: string, profileId: string, watchId: string, checkedAt: Date): Promise<CompanyWatch | null>;
}

export class InMemoryCompanyWatchRepository implements CompanyWatchRepository {
  private readonly watches = new Map<string, CompanyWatch>();

  async findActive(): Promise<CompanyWatch[]> {
    return [...this.watches.values()].filter((watch) => watch.isActive);
  }

  async findForProfile(userId: string, profileId: string): Promise<CompanyWatch[]> {
    return [...this.watches.values()].filter((watch) => watch.userId === userId && watch.profileId === profileId);
  }

  async create(userId: string, profileId: string, input: CreateCompanyWatchInput): Promise<CompanyWatch> {
    const existingWatch = [...this.watches.values()].find(
      (watch) => watch.userId === userId && watch.profileId === profileId && watch.careersUrl === input.careersUrl
    );

    if (existingWatch !== undefined) {
      const updatedWatch = { ...existingWatch, ...input, isActive: true };
      this.watches.set(updatedWatch.id, updatedWatch);
      return updatedWatch;
    }

    const watch: CompanyWatch = {
      id: randomUUID(),
      userId,
      profileId,
      ...input,
      isActive: true,
      createdAt: new Date()
    };

    this.watches.set(watch.id, watch);
    return watch;
  }

  async delete(userId: string, profileId: string, watchId: string): Promise<boolean> {
    const watch = this.watches.get(watchId);
    if (watch === undefined || watch.userId !== userId || watch.profileId !== profileId) {
      return false;
    }

    return this.watches.delete(watchId);
  }

  async markChecked(userId: string, profileId: string, watchId: string, checkedAt: Date): Promise<CompanyWatch | null> {
    const watch = this.watches.get(watchId);
    if (watch === undefined || watch.userId !== userId || watch.profileId !== profileId) {
      return null;
    }

    const updatedWatch = { ...watch, lastCheckedAt: checkedAt };
    this.watches.set(watchId, updatedWatch);
    return updatedWatch;
  }
}

export class PrismaCompanyWatchRepository implements CompanyWatchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findActive(): Promise<CompanyWatch[]> {
    const watches = await this.prisma.companyWatch.findMany({
      where: { isActive: true },
      orderBy: { lastCheckedAt: "asc" }
    });

    return watches.map(toCompanyWatch);
  }

  async findForProfile(userId: string, profileId: string): Promise<CompanyWatch[]> {
    const watches = await this.prisma.companyWatch.findMany({
      where: { userId, profileId },
      orderBy: { companyName: "asc" }
    });

    return watches.map(toCompanyWatch);
  }

  async create(userId: string, profileId: string, input: CreateCompanyWatchInput): Promise<CompanyWatch> {
    const watch = await this.prisma.companyWatch.upsert({
      where: {
        userId_profileId_careersUrl: {
          userId,
          profileId,
          careersUrl: input.careersUrl
        }
      },
      update: {
        ...input,
        isActive: true
      },
      create: {
        userId,
        profileId,
        ...input
      }
    });

    return toCompanyWatch(watch);
  }

  async delete(userId: string, profileId: string, watchId: string): Promise<boolean> {
    const existingWatch = await this.prisma.companyWatch.findFirst({
      where: { id: watchId, userId, profileId }
    });

    if (existingWatch === null) {
      return false;
    }

    await this.prisma.companyWatch.delete({
      where: { id: watchId }
    });
    return true;
  }

  async markChecked(userId: string, profileId: string, watchId: string, checkedAt: Date): Promise<CompanyWatch | null> {
    const existingWatch = await this.prisma.companyWatch.findFirst({
      where: { id: watchId, userId, profileId }
    });

    if (existingWatch === null) {
      return null;
    }

    const watch = await this.prisma.companyWatch.update({
      where: { id: watchId },
      data: { lastCheckedAt: checkedAt }
    });

    return toCompanyWatch(watch);
  }
}

type PrismaCompanyWatch = Awaited<ReturnType<PrismaClient["companyWatch"]["findUnique"]>>;

function toCompanyWatch(watch: NonNullable<PrismaCompanyWatch>): CompanyWatch {
  const companyWatch: CompanyWatch = {
    id: watch.id,
    userId: watch.userId,
    profileId: watch.profileId,
    companyName: watch.companyName,
    careersUrl: watch.careersUrl,
    checkCadenceDays: watch.checkCadenceDays,
    isActive: watch.isActive,
    createdAt: watch.createdAt
  };

  if (watch.websiteUrl !== null) companyWatch.websiteUrl = watch.websiteUrl;
  if (watch.lastCheckedAt !== null) companyWatch.lastCheckedAt = watch.lastCheckedAt;

  return companyWatch;
}
