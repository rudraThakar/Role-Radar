import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InMemoryJobStateRepository } from "../job-states/job-state.repository.js";
import { InMemoryJobRepository } from "../jobs/job.repository.js";
import { InMemoryProfileRepository } from "../profiles/profile.repository.js";
import { RecommendationService } from "./recommendation.service.js";

describe("recommendation service", () => {
  it("returns profile-specific recommendations sorted by score", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const jobRepository = new InMemoryJobRepository();
    const jobStateRepository = new InMemoryJobStateRepository();
    const service = new RecommendationService(profileRepository, jobRepository, jobStateRepository);
    const userId = "user_1";

    const profile = await profileRepository.create(userId, {
      name: "Backend SDE",
      domain: "SOFTWARE",
      graduationYear: 2027,
      experienceMonths: 0,
      preferredRoles: ["Backend Engineer"],
      preferredLocations: ["Bengaluru"],
      preferredWorkModes: ["HYBRID", "REMOTE"],
      targetCompanies: ["NVIDIA"],
      excludedCompanies: [],
      includedKeywords: [],
      excludedKeywords: [],
      skills: ["C++", "TypeScript", "Python"],
      seeksEmploymentTypes: ["FULL_TIME"]
    });

    const softwareJob = await jobRepository.create({
      companyName: "NVIDIA",
      title: "New Grad Backend Software Engineer",
      normalizedTitle: "new grad backend software engineer",
      description: "Entry-level role for 2027 graduates. C++ and Python are preferred.",
      employmentType: "FULL_TIME",
      seniority: "ENTRY_LEVEL",
      domains: ["SOFTWARE"],
      skills: ["C++", "Python"],
      minimumExperienceMonths: 0,
      eligibleGraduationYears: [2027],
      locations: ["Bengaluru"],
      workMode: "HYBRID",
      sourceUrl: "https://example.com/jobs/1",
      applyUrl: "https://example.com/jobs/1/apply",
      discoveredAt: new Date("2026-10-07T00:00:00.000Z")
    });

    await jobRepository.create({
      companyName: "Example Hardware",
      title: "Senior RTL Design Engineer",
      normalizedTitle: "senior rtl design engineer",
      description: "Requires 5 years of RTL design experience.",
      employmentType: "FULL_TIME",
      seniority: "SENIOR",
      domains: ["DIGITAL_HARDWARE"],
      skills: ["Verilog"],
      minimumExperienceMonths: 60,
      locations: ["Bengaluru"],
      workMode: "HYBRID",
      sourceUrl: "https://example.com/jobs/2",
      applyUrl: "https://example.com/jobs/2/apply",
      discoveredAt: new Date("2026-10-07T00:00:00.000Z")
    });

    await jobRepository.create({
      companyName: "Example Hardware",
      title: "RTL Design Engineer New Grad",
      normalizedTitle: "rtl design engineer new grad",
      description: "Entry-level RTL design verification role for 2027 graduates in Bengaluru.",
      employmentType: "FULL_TIME",
      seniority: "ENTRY_LEVEL",
      domains: ["DIGITAL_HARDWARE"],
      skills: ["Verilog"],
      minimumExperienceMonths: 0,
      eligibleGraduationYears: [2027],
      locations: ["Bengaluru"],
      workMode: "HYBRID",
      sourceUrl: "https://example.com/jobs/3",
      applyUrl: "https://example.com/jobs/3/apply",
      discoveredAt: new Date("2026-10-07T00:00:00.000Z")
    });

    const recommendations = await service.listRecommendations(userId, profile.id);

    assert.equal(recommendations.length, 1);
    assert.equal(recommendations[0]?.job.companyName, "NVIDIA");
    assert.equal(recommendations[0]?.eligibility, "ELIGIBLE");

    await jobStateRepository.setState(userId, profile.id, softwareJob.id, "SAVED");
    const savedRecommendations = await service.listRecommendations(userId, profile.id);
    assert.equal(savedRecommendations[0]?.state, "SAVED");

    await jobStateRepository.setState(userId, profile.id, softwareJob.id, "HIDDEN");
    assert.deepEqual(await service.listRecommendations(userId, profile.id), []);
  });
});
