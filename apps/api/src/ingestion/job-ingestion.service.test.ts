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
          sourceUrl: "https://example.com/jobs/nvidia/backend-new-grad",
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
  });
});
