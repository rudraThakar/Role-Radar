import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import type { CreateResumeInput } from "./resume.dto.js";
import type { Resume } from "./resume.types.js";

export interface ResumeRepository {
  findForProfile(profileId: string): Promise<Resume[]>;
  create(profileId: string, input: CreateResumeInput): Promise<Resume>;
  activate(profileId: string, resumeId: string): Promise<Resume | null>;
}

export class InMemoryResumeRepository implements ResumeRepository {
  private readonly resumes = new Map<string, Resume>();

  async findForProfile(profileId: string): Promise<Resume[]> {
    return [...this.resumes.values()].filter((resume) => resume.profileId === profileId);
  }

  async create(profileId: string, input: CreateResumeInput): Promise<Resume> {
    for (const resume of this.resumes.values()) {
      if (resume.profileId === profileId) {
        resume.isActive = false;
      }
    }

    const resume: Resume = {
      id: randomUUID(),
      profileId,
      ...input,
      extractionStatus: input.extractionStatus ?? "PENDING",
      isActive: true,
      createdAt: new Date()
    };

    this.resumes.set(resume.id, resume);
    return resume;
  }

  async activate(profileId: string, resumeId: string): Promise<Resume | null> {
    const targetResume = this.resumes.get(resumeId);
    if (targetResume === undefined || targetResume.profileId !== profileId) {
      return null;
    }

    for (const resume of this.resumes.values()) {
      if (resume.profileId === profileId) {
        resume.isActive = resume.id === resumeId;
      }
    }

    return targetResume;
  }
}

export class PrismaResumeRepository implements ResumeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findForProfile(profileId: string): Promise<Resume[]> {
    const resumes = await this.prisma.resume.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" }
    });

    return resumes.map(toResume);
  }

  async create(profileId: string, input: CreateResumeInput): Promise<Resume> {
    const resume = await this.prisma.$transaction(async (transaction) => {
      await transaction.resume.updateMany({
        where: { profileId },
        data: { isActive: false }
      });

      return transaction.resume.create({
        data: {
          profileId,
          ...input,
          isActive: true
        }
      });
    });

    return toResume(resume);
  }

  async activate(profileId: string, resumeId: string): Promise<Resume | null> {
    const existingResume = await this.prisma.resume.findFirst({
      where: { id: resumeId, profileId }
    });

    if (existingResume === null) {
      return null;
    }

    const resume = await this.prisma.$transaction(async (transaction) => {
      await transaction.resume.updateMany({
        where: { profileId },
        data: { isActive: false }
      });

      return transaction.resume.update({
        where: { id: resumeId },
        data: { isActive: true }
      });
    });

    return toResume(resume);
  }
}

function toResume(resume: {
  id: string;
  profileId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string | null;
  checksumSha256: string | null;
  extractedText: string | null;
  extractionError: string | null;
  extractionStatus: Resume["extractionStatus"];
  isActive: boolean;
  createdAt: Date;
}): Resume {
  const mappedResume: Resume = {
    id: resume.id,
    profileId: resume.profileId,
    originalFilename: resume.originalFilename,
    mimeType: resume.mimeType,
    sizeBytes: resume.sizeBytes,
    extractionStatus: resume.extractionStatus,
    isActive: resume.isActive,
    createdAt: resume.createdAt
  };

  if (resume.storageKey !== null) mappedResume.storageKey = resume.storageKey;
  if (resume.checksumSha256 !== null) mappedResume.checksumSha256 = resume.checksumSha256;
  if (resume.extractedText !== null) mappedResume.extractedText = resume.extractedText;
  if (resume.extractionError !== null) mappedResume.extractionError = resume.extractionError;

  return mappedResume;
}
