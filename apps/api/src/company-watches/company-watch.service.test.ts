import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InMemoryProfileRepository } from "../profiles/profile.repository.js";
import { HttpError } from "../shared/http-error.js";
import { InMemoryCompanyWatchRepository } from "./company-watch.repository.js";
import { CompanyWatchService } from "./company-watch.service.js";

describe("company watch service", () => {
  it("creates company watches for a user-owned profile", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const companyWatchRepository = new InMemoryCompanyWatchRepository();
    const service = new CompanyWatchService(profileRepository, companyWatchRepository);
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

    const watch = await service.createCompanyWatch(userId, profile.id, {
      companyName: "NVIDIA",
      careersUrl: "https://nvidia.com/careers",
      websiteUrl: "https://nvidia.com",
      checkCadenceDays: 1
    });
    const watches = await service.listCompanyWatches(userId, profile.id);

    assert.equal(watch.companyName, "NVIDIA");
    assert.equal(watches.length, 1);
  });

  it("bulk imports company watches", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const companyWatchRepository = new InMemoryCompanyWatchRepository();
    const service = new CompanyWatchService(profileRepository, companyWatchRepository);
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

    const result = await service.bulkCreateCompanyWatches(userId, profile.id, {
      watches: [
        { companyName: "NVIDIA", careersUrl: "https://nvidia.com/careers", checkCadenceDays: 1 },
        { companyName: "AMD", careersUrl: "https://careers.amd.com", checkCadenceDays: 2 }
      ]
    });

    assert.equal(result.imported, 2);
    assert.deepEqual(
      result.watches.map((watch) => watch.companyName),
      ["NVIDIA", "AMD"]
    );
  });

  it("checks watched companies for a user-owned profile", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const companyWatchRepository = new InMemoryCompanyWatchRepository();
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
    const service = new CompanyWatchService(profileRepository, companyWatchRepository, {
      async checkProfileWatches(checkedUserId: string, checkedProfileId: string) {
        assert.equal(checkedUserId, userId);
        assert.equal(checkedProfileId, profile.id);
        return {
          checked: 1,
          skipped: 0,
          created: 1,
          updated: 0,
          failed: 0,
          jobs: []
        };
      }
    } as never);

    const result = await service.checkNow(userId, profile.id);

    assert.equal(result.checked, 1);
    assert.equal(result.created, 1);
  });


  it("rejects watches for profiles the user does not own", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const service = new CompanyWatchService(profileRepository, new InMemoryCompanyWatchRepository());
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
        service.createCompanyWatch("user_2", profile.id, {
          companyName: "NVIDIA",
          careersUrl: "https://nvidia.com/careers",
          checkCadenceDays: 1
        }),
      HttpError
    );
  });
});
