import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InMemoryProfileRepository } from "../profiles/profile.repository.js";
import { HttpError } from "../shared/http-error.js";
import { InMemoryResumeRepository } from "./resume.repository.js";
import { ResumeService } from "./resume.service.js";

describe("resume service", () => {
  it("creates resumes and keeps one active resume per profile", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const resumeRepository = new InMemoryResumeRepository();
    const service = new ResumeService(profileRepository, resumeRepository);
    const userId = "user_1";

    const profile = await profileRepository.create(userId, {
      name: "Backend SDE",
      domain: "SOFTWARE",
      experienceMonths: 0,
      preferredRoles: [],
      preferredLocations: [],
      preferredWorkModes: [],
      targetCompanies: [],
      excludedCompanies: [],
      includedKeywords: [],
      excludedKeywords: [],
      skills: [],
      seeksEmploymentTypes: ["FULL_TIME"]
    });

    const firstResume = await service.createResume(userId, profile.id, {
      originalFilename: "sde_resume_v1.pdf",
      mimeType: "application/pdf",
      sizeBytes: 120_000
    });

    const secondResume = await service.createResume(userId, profile.id, {
      originalFilename: "sde_resume_v2.pdf",
      mimeType: "application/pdf",
      sizeBytes: 130_000
    });

    let resumes = await service.listResumes(userId, profile.id);
    assert.equal(resumes.find((resume) => resume.id === firstResume.id)?.isActive, false);
    assert.equal(resumes.find((resume) => resume.id === secondResume.id)?.isActive, true);

    await service.activateResume(userId, profile.id, firstResume.id);
    resumes = await service.listResumes(userId, profile.id);
    assert.equal(resumes.find((resume) => resume.id === firstResume.id)?.isActive, true);
    assert.equal(resumes.find((resume) => resume.id === secondResume.id)?.isActive, false);
  });

  it("suggests skills from extracted resume text", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const resumeRepository = new InMemoryResumeRepository();
    const service = new ResumeService(profileRepository, resumeRepository);
    const userId = "user_1";

    const profile = await profileRepository.create(userId, {
      name: "Backend SDE",
      domain: "SOFTWARE",
      experienceMonths: 0,
      preferredRoles: [],
      preferredLocations: [],
      preferredWorkModes: [],
      targetCompanies: [],
      excludedCompanies: [],
      includedKeywords: [],
      excludedKeywords: [],
      skills: [],
      seeksEmploymentTypes: ["FULL_TIME"]
    });

    const resume = await service.createResume(userId, profile.id, {
      originalFilename: "resume.pdf",
      mimeType: "application/pdf",
      sizeBytes: 120_000,
      extractionStatus: "COMPLETED",
      extractedText: "Experience with TypeScript, Node.js, PostgreSQL and C++."
    });

    const suggestions = await service.suggestSkills(userId, profile.id, resume.id);

    assert.deepEqual(
      suggestions.map((suggestion) => suggestion.skill),
      ["C++", "Node.js", "PostgreSQL", "TypeScript"]
    );
  });

  it("suggests target roles from extracted resume text", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const resumeRepository = new InMemoryResumeRepository();
    const service = new ResumeService(profileRepository, resumeRepository);
    const userId = "user_1";

    const profile = await profileRepository.create(userId, {
      name: "Backend SDE",
      domain: "SOFTWARE",
      experienceMonths: 0,
      preferredRoles: [],
      preferredLocations: [],
      preferredWorkModes: [],
      targetCompanies: [],
      excludedCompanies: [],
      includedKeywords: [],
      excludedKeywords: [],
      skills: [],
      seeksEmploymentTypes: ["FULL_TIME"]
    });

    const resume = await service.createResume(userId, profile.id, {
      originalFilename: "resume.pdf",
      mimeType: "application/pdf",
      sizeBytes: 120_000,
      extractionStatus: "COMPLETED",
      extractedText: "Built backend APIs with Express and created RTL components in Verilog."
    });

    const suggestions = await service.suggestProfileTargets(userId, profile.id, resume.id);

    assert.deepEqual(
      suggestions.roles.map((suggestion) => suggestion.role),
      ["Backend Engineer", "RTL Design Engineer"]
    );
  });

  it("rejects resume operations for profiles the user does not own", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const service = new ResumeService(profileRepository, new InMemoryResumeRepository());

    const profile = await profileRepository.create("user_1", {
      name: "Backend SDE",
      domain: "SOFTWARE",
      experienceMonths: 0,
      preferredRoles: [],
      preferredLocations: [],
      preferredWorkModes: [],
      targetCompanies: [],
      excludedCompanies: [],
      includedKeywords: [],
      excludedKeywords: [],
      skills: [],
      seeksEmploymentTypes: ["FULL_TIME"]
    });

    await assert.rejects(
      () =>
        service.createResume("user_2", profile.id, {
          originalFilename: "resume.pdf",
          mimeType: "application/pdf",
          sizeBytes: 120_000
        }),
      HttpError
    );
  });
});
