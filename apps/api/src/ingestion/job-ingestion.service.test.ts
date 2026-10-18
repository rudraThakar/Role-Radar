import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InMemoryJobRepository } from "../jobs/job.repository.js";
import { InMemoryProfileRepository } from "../profiles/profile.repository.js";
import { JobIngestionService } from "./job-ingestion.service.js";

describe("job ingestion service", () => {
  it("normalizes raw postings and upserts by source URL", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const jobRepository = new InMemoryJobRepository();
    const service = new JobIngestionService(profileRepository, jobRepository);
    const userId = "user_1";
    const profile = await profileRepository.create(userId, {
      name: "Backend SDE",
      domain: "SOFTWARE",
      experienceMonths: 0,
      preferredRoles: ["Backend Engineer"],
      preferredLocations: ["Bengaluru", "Remote"],
      preferredWorkModes: ["REMOTE", "HYBRID"],
      targetCompanies: [],
      excludedCompanies: [],
      includedKeywords: [],
      excludedKeywords: [],
      skills: ["TypeScript", "Node.js"],
      seeksEmploymentTypes: ["FULL_TIME"]
    });

    const firstResult = await service.importJobsForProfile(userId, profile.id, {
      jobs: [
        {
          companyName: "NVIDIA",
          title: "New Grad Backend Engineer",
          description: "New grad backend role in Bengaluru using Node.js and PostgreSQL.",
          sourceUrl: "https://example.com/jobs/nvidia/backend-new-grad?utm_source=linkedin",
          locations: ["Bengaluru"]
        }
      ]
    });
    const secondResult = await service.importJobsForProfile(userId, profile.id, {
      jobs: [
        {
          companyName: "NVIDIA",
          title: "New Grad Backend Engineer",
          description: "New grad backend role in Bengaluru using Node.js, PostgreSQL and TypeScript.",
          sourceUrl: "https://example.com/jobs/nvidia/backend-new-grad",
          locations: ["Bengaluru"]
        }
      ]
    });

    assert.equal(firstResult.created, 1);
    assert.equal(secondResult.updated, 1);
    assert.equal(secondResult.jobs[0]?.domains.includes("SOFTWARE"), true);
    assert.equal(secondResult.jobs[0]?.minimumExperienceMonths, 0);
    assert.equal((await jobRepository.findAll()).length, 1);
  });

  it("extracts bounded experience ranges", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const jobRepository = new InMemoryJobRepository();
    const service = new JobIngestionService(profileRepository, jobRepository);
    const profile = await profileRepository.create("user_1", {
      name: "Mechanical Engineer",
      domain: "MECHANICAL",
      experienceMonths: 36,
      preferredRoles: ["Mechanical Engineer"],
      preferredLocations: ["India"],
      preferredWorkModes: ["ONSITE"],
      targetCompanies: [],
      excludedCompanies: [],
      includedKeywords: [],
      excludedKeywords: [],
      skills: ["CAD"],
      seeksEmploymentTypes: ["FULL_TIME"]
    });

    const result = await service.importJobsForProfile("user_1", profile.id, {
      jobs: [{
        companyName: "Example Manufacturing",
        title: "Mechanical Engineer",
        description: "This onsite role in India requires 2-4 years of CAD experience.",
        sourceUrl: "https://example.com/jobs/mechanical-engineer",
        locations: ["India"]
      }]
    });

    assert.equal(result.jobs[0]?.minimumExperienceMonths, 24);
    assert.equal(result.jobs[0]?.maximumExperienceMonths, 48);
  });

  it("keeps explicit staff and senior title signals above description wording", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const jobRepository = new InMemoryJobRepository();
    const service = new JobIngestionService(profileRepository, jobRepository);
    const profile = await profileRepository.create("user_1", {
      name: "RTL Engineer",
      domain: "DIGITAL_HARDWARE",
      experienceMonths: 0,
      preferredRoles: ["Design Verification Engineer"],
      preferredLocations: ["Bengaluru"],
      preferredWorkModes: ["HYBRID"],
      targetCompanies: [],
      excludedCompanies: [],
      includedKeywords: [],
      excludedKeywords: [],
      skills: ["SystemVerilog"],
      seeksEmploymentTypes: ["FULL_TIME"]
    });

    const result = await service.importJobsForProfile("user_1", profile.id, {
      jobs: [{
        companyName: "Example Semiconductor",
        title: "Staff Engineer, Design Verification",
        description: "Support entry-level engineers on SystemVerilog verification projects.",
        sourceUrl: "https://example.com/jobs/staff-design-verification",
        locations: ["Bengaluru"]
      }]
    });

    assert.equal(result.jobs[0]?.seniority, "SENIOR");
  });
});
