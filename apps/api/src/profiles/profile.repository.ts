import { randomUUID } from "node:crypto";

import type { CareerProfile } from "@roleradar/domain";
import type { PrismaClient } from "@prisma/client";

import type { CreateProfileInput, UpdateProfileInput } from "./profile.dto.js";

export interface ProfileRepository {
  findAll(userId: string): Promise<CareerProfile[]>;
  findById(userId: string, profileId: string): Promise<CareerProfile | null>;
  create(userId: string, input: CreateProfileInput): Promise<CareerProfile>;
  update(userId: string, profileId: string, input: UpdateProfileInput): Promise<CareerProfile | null>;
  delete(userId: string, profileId: string): Promise<boolean>;
  findAllOwned(): Promise<Array<{ userId: string; profile: CareerProfile }>>;
}

export class InMemoryProfileRepository implements ProfileRepository {
  private readonly profiles = new Map<string, CareerProfile & { userId: string }>();

  async findAll(userId: string): Promise<CareerProfile[]> {
    return [...this.profiles.values()].filter((profile) => profile.userId === userId).map(toPublicCareerProfile);
  }

  async findById(userId: string, profileId: string): Promise<CareerProfile | null> {
    const profile = this.profiles.get(profileId);
    if (profile === undefined || profile.userId !== userId) {
      return null;
    }

    return toPublicCareerProfile(profile);
  }

  async create(userId: string, input: CreateProfileInput): Promise<CareerProfile> {
    const profile: CareerProfile & { userId: string } = {
      id: randomUUID(),
      userId,
      ...input
    };

    this.profiles.set(profile.id, profile);
    return toPublicCareerProfile(profile);
  }

  async update(userId: string, profileId: string, input: UpdateProfileInput): Promise<CareerProfile | null> {
    const profile = this.profiles.get(profileId);
    if (profile === undefined || profile.userId !== userId) {
      return null;
    }

    const updatedProfile: CareerProfile & { userId: string } = {
      ...profile,
      ...input
    };

    this.profiles.set(profileId, updatedProfile);
    return toPublicCareerProfile(updatedProfile);
  }

  async delete(userId: string, profileId: string): Promise<boolean> {
    const profile = this.profiles.get(profileId);
    if (profile === undefined || profile.userId !== userId) {
      return false;
    }

    return this.profiles.delete(profileId);
  }

  async findAllOwned(): Promise<Array<{ userId: string; profile: CareerProfile }>> {
    return [...this.profiles.values()].map((profile) => ({ userId: profile.userId, profile: toPublicCareerProfile(profile) }));
  }
}

export class PrismaProfileRepository implements ProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(userId: string): Promise<CareerProfile[]> {
    const profiles = await this.prisma.careerProfile.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" }
    });

    return profiles.map(toCareerProfile);
  }

  async findById(userId: string, profileId: string): Promise<CareerProfile | null> {
    const profile = await this.prisma.careerProfile.findFirst({
      where: { id: profileId, userId }
    });

    return profile === null ? null : toCareerProfile(profile);
  }

  async create(userId: string, input: CreateProfileInput): Promise<CareerProfile> {
    const profile = await this.prisma.careerProfile.create({
      data: {
        ...input,
        userId
      }
    });

    return toCareerProfile(profile);
  }

  async update(userId: string, profileId: string, input: UpdateProfileInput): Promise<CareerProfile | null> {
    const existingProfile = await this.prisma.careerProfile.findFirst({
      where: { id: profileId, userId }
    });

    if (existingProfile === null) {
      return null;
    }

    const profile = await this.prisma.careerProfile.update({
      where: { id: profileId },
      data: input
    });

    return toCareerProfile(profile);
  }

  async delete(userId: string, profileId: string): Promise<boolean> {
    const existingProfile = await this.prisma.careerProfile.findFirst({
      where: { id: profileId, userId }
    });

    if (existingProfile === null) {
      return false;
    }

    await this.prisma.careerProfile.delete({
      where: { id: profileId }
    });

    return true;
  }

  async findAllOwned(): Promise<Array<{ userId: string; profile: CareerProfile }>> {
    const profiles = await this.prisma.careerProfile.findMany({
      where: { userId: { not: null } },
      orderBy: { createdAt: "asc" }
    });

    return profiles.flatMap((profile) =>
      profile.userId === null ? [] : [{ userId: profile.userId, profile: toCareerProfile(profile) }]
    );
  }
}

type PrismaCareerProfile = Awaited<ReturnType<PrismaClient["careerProfile"]["findUnique"]>>;

function toCareerProfile(profile: NonNullable<PrismaCareerProfile>): CareerProfile {
  const careerProfile: CareerProfile = {
    id: profile.id,
    name: profile.name,
    domain: profile.domain,
    experienceMonths: profile.experienceMonths,
    preferredRoles: profile.preferredRoles,
    preferredLocations: profile.preferredLocations,
    preferredWorkModes: profile.preferredWorkModes,
    citizenshipCountry: profile.citizenshipCountry,
    includeInternationalRoles: profile.includeInternationalRoles,
    targetCompanies: profile.targetCompanies,
    excludedCompanies: profile.excludedCompanies,
    includedKeywords: profile.includedKeywords,
    excludedKeywords: profile.excludedKeywords,
    skills: profile.skills,
    seeksEmploymentTypes: profile.seeksEmploymentTypes
  };

  if (profile.graduationYear !== null) careerProfile.graduationYear = profile.graduationYear;
  if (profile.minimumSalary !== null) careerProfile.minimumSalary = profile.minimumSalary;
  if (profile.salaryCurrency !== null) careerProfile.salaryCurrency = profile.salaryCurrency;

  return careerProfile;
}

function toPublicCareerProfile(profile: CareerProfile & { userId: string }): CareerProfile {
  const { userId: _userId, ...careerProfile } = profile;
  return careerProfile;
}
