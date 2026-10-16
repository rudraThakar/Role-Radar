import type { Request, Response } from "express";
import { createHash } from "node:crypto";

import { requireAuthUser } from "../auth/auth.middleware.js";
import { HttpError } from "../shared/http-error.js";
import { extractPdfText } from "./pdf-text-extractor.js";
import type { CreateResumeInput } from "./resume.dto.js";
import { parseCreateResumeInput } from "./resume.dto.js";
import type { ResumeFileStorage } from "./resume-file-storage.js";
import type { ResumeService } from "./resume.service.js";

export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly resumeFileStorage: ResumeFileStorage
  ) {}

  async listResumes(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const resumes = await this.resumeService.listResumes(user.id, requiredProfileId(request));
    response.status(200).json({ data: resumes });
  }

  async createResume(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const profileId = requiredProfileId(request);
    await this.resumeService.ensureProfileAccess(user.id, profileId);
    const resume = await this.resumeService.createResume(
      user.id,
      profileId,
      await parseResumeRequest(request, this.resumeFileStorage)
    );
    response.status(201).json({ data: resume });
  }

  async activateResume(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const resume = await this.resumeService.activateResume(user.id, requiredProfileId(request), requiredResumeId(request));
    response.status(200).json({ data: resume });
  }

  async suggestSkills(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const suggestions = await this.resumeService.suggestSkills(user.id, requiredProfileId(request), requiredResumeId(request));
    response.status(200).json({ data: suggestions });
  }

  async suggestProfileTargets(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const suggestions = await this.resumeService.suggestProfileTargets(
      user.id,
      requiredProfileId(request),
      requiredResumeId(request)
    );
    response.status(200).json({ data: suggestions });
  }
}

async function parseResumeRequest(request: Request, resumeFileStorage: ResumeFileStorage): Promise<CreateResumeInput> {
  if (request.file === undefined) {
    return parseCreateResumeInput(request.body);
  }

  const profileId = requiredProfileId(request);
  const fileBuffer = request.file.buffer;
  const checksumSha256 = createHash("sha256").update(fileBuffer).digest("hex");
  const extractionResult = await extractPdfText(fileBuffer);
  const user = requireAuthUser(request);
  const storageKey = await resumeFileStorage.upload({
    buffer: fileBuffer,
    checksumSha256,
    mimeType: request.file.mimetype || "application/pdf",
    originalFilename: request.file.originalname,
    profileId,
    userId: user.id
  });

  return {
    originalFilename: request.file.originalname,
    mimeType: request.file.mimetype || "application/pdf",
    sizeBytes: request.file.size,
    storageKey,
    checksumSha256,
    ...extractionResult
  };
}

function requiredProfileId(request: Request): string {
  const profileId = request.params.profileId;
  if (profileId === undefined || profileId.trim().length === 0) {
    throw new HttpError(400, "profileId route parameter is required");
  }

  return profileId;
}

function requiredResumeId(request: Request): string {
  const resumeId = request.params.resumeId;
  if (resumeId === undefined || resumeId.trim().length === 0) {
    throw new HttpError(400, "resumeId route parameter is required");
  }

  return resumeId;
}
