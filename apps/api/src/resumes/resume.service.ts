import {
  suggestProfileTargetsFromText,
  suggestSkillsFromText,
  type ProfileTargetSuggestion,
  type SkillSuggestion
} from "@roleradar/domain";

import type { ProfileRepository } from "../profiles/profile.repository.js";
import { HttpError } from "../shared/http-error.js";
import type { CreateResumeInput } from "./resume.dto.js";
import type { ResumeRepository } from "./resume.repository.js";
import type { Resume } from "./resume.types.js";

export class ResumeService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly resumeRepository: ResumeRepository
  ) {}

  async listResumes(userId: string, profileId: string): Promise<Resume[]> {
    await this.ensureProfileOwnership(userId, profileId);
    return this.resumeRepository.findForProfile(profileId);
  }

  async createResume(userId: string, profileId: string, input: CreateResumeInput): Promise<Resume> {
    await this.ensureProfileOwnership(userId, profileId);
    return this.resumeRepository.create(profileId, input);
  }

  async activateResume(userId: string, profileId: string, resumeId: string): Promise<Resume> {
    await this.ensureProfileOwnership(userId, profileId);
    const resume = await this.resumeRepository.activate(profileId, resumeId);
    if (resume === null) {
      throw new HttpError(404, "Resume not found");
    }

    return resume;
  }

  async suggestSkills(userId: string, profileId: string, resumeId: string): Promise<SkillSuggestion[]> {
    await this.ensureProfileOwnership(userId, profileId);
    const resumes = await this.resumeRepository.findForProfile(profileId);
    const resume = resumes.find((candidate) => candidate.id === resumeId);

    if (resume === undefined) {
      throw new HttpError(404, "Resume not found");
    }

    if (resume.extractedText === undefined || resume.extractedText.trim().length === 0) {
      return [];
    }

    return suggestSkillsFromText(resume.extractedText);
  }

  async suggestProfileTargets(userId: string, profileId: string, resumeId: string): Promise<ProfileTargetSuggestion> {
    await this.ensureProfileOwnership(userId, profileId);
    const resumes = await this.resumeRepository.findForProfile(profileId);
    const resume = resumes.find((candidate) => candidate.id === resumeId);

    if (resume === undefined) {
      throw new HttpError(404, "Resume not found");
    }

    if (resume.extractedText === undefined || resume.extractedText.trim().length === 0) {
      return { roles: [], domains: [] };
    }

    return suggestProfileTargetsFromText(resume.extractedText);
  }

  async ensureProfileAccess(userId: string, profileId: string): Promise<void> {
    await this.ensureProfileOwnership(userId, profileId);
  }

  private async ensureProfileOwnership(userId: string, profileId: string): Promise<void> {
    const profile = await this.profileRepository.findById(userId, profileId);
    if (profile === null) {
      throw new HttpError(404, "Profile not found");
    }
  }
}
