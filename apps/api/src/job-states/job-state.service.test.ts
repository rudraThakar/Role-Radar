import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpError } from "../shared/http-error.js";
import { InMemoryJobRepository } from "../jobs/job.repository.js";
import { InMemoryProfileRepository } from "../profiles/profile.repository.js";
import { InMemoryJobStateRepository } from "./job-state.repository.js";
import { JobStateService } from "./job-state.service.js";

describe("job state service", () => {
  it("sets and clears state for an owned profile and existing job", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const jobRepository = new InMemoryJobRepository();
    const jobStateRepository = new InMemoryJobStateRepository();
    const service = new JobStateService(profileRepository, jobRepository, jobStateRepository);
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

    const job = await jobRepository.create({
      companyName: "NVIDIA",
      title: "New Grad Backend Software Engineer",
      normalizedTitle: "new grad backend software engineer",
      description: "Entry-level role.",
      employmentType: "FULL_TIME",
      seniority: "ENTRY_LEVEL",
      domains: ["SOFTWARE"],
      skills: [],
      locations: ["Bengaluru"],
      workMode: "HYBRID",
      sourceUrl: "https://example.com/jobs/1",
      applyUrl: "https://example.com/jobs/1/apply",
      discoveredAt: new Date("2026-10-07T00:00:00.000Z")
    });

    const saved = await service.setState(userId, profile.id, job.id, "SAVED");
    assert.equal(saved.state, "SAVED");

    const savedStates = await service.listStates(userId, profile.id, "SAVED");
    assert.equal(savedStates.length, 1);
    assert.equal(savedStates[0]?.job.id, job.id);

    await service.clearState(userId, profile.id, job.id);
    assert.equal(await jobStateRepository.findOne(userId, profile.id, job.id), null);
  });

  it("rejects state changes for profiles the user does not own", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const jobRepository = new InMemoryJobRepository();
    const service = new JobStateService(profileRepository, jobRepository, new InMemoryJobStateRepository());

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

    const job = await jobRepository.create({
      companyName: "NVIDIA",
      title: "New Grad Backend Software Engineer",
      normalizedTitle: "new grad backend software engineer",
      description: "Entry-level role.",
      employmentType: "FULL_TIME",
      seniority: "ENTRY_LEVEL",
      domains: ["SOFTWARE"],
      skills: [],
      locations: ["Bengaluru"],
      workMode: "HYBRID",
      sourceUrl: "https://example.com/jobs/1",
      applyUrl: "https://example.com/jobs/1/apply",
      discoveredAt: new Date("2026-10-07T00:00:00.000Z")
    });

    await assert.rejects(() => service.setState("user_2", profile.id, job.id, "SAVED"), HttpError);
  });

  it("tracks application stage and notes for an existing job", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const jobRepository = new InMemoryJobRepository();
    const jobStateRepository = new InMemoryJobStateRepository();
    const service = new JobStateService(profileRepository, jobRepository, jobStateRepository);
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

    const job = await jobRepository.create({
      companyName: "Stripe",
      title: "Backend Software Engineer",
      normalizedTitle: "backend software engineer",
      description: "Backend role.",
      employmentType: "FULL_TIME",
      seniority: "ENTRY_LEVEL",
      domains: ["SOFTWARE"],
      skills: [],
      locations: ["Bengaluru"],
      workMode: "HYBRID",
      sourceUrl: "https://example.com/jobs/2",
      applyUrl: "https://example.com/jobs/2/apply",
      discoveredAt: new Date("2026-10-08T00:00:00.000Z")
    });

    const application = await service.updateApplication(userId, profile.id, job.id, {
      applicationStage: "INTERVIEWING",
      applicationNotes: "Recruiter screen scheduled"
    });

    assert.equal(application.state, "APPLIED");
    assert.equal(application.applicationStage, "INTERVIEWING");
    assert.equal(application.applicationNotes, "Recruiter screen scheduled");
    assert.ok(application.appliedAt instanceof Date);
  });
});
