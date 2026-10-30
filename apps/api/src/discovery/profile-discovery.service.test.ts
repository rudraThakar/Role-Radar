import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InMemoryJobRepository } from "../jobs/job.repository.js";
import { InMemoryProfileRepository } from "../profiles/profile.repository.js";
import type { CareerPageFetcher } from "../watch-checker/career-page-fetcher.js";
import { InMemoryDiscoverySourceRepository } from "./discovery-source.repository.js";
import { ProfileDiscoveryService } from "./profile-discovery.service.js";
import type { DiscoverySource } from "./source-registry.js";

const source: DiscoverySource = {
  id: "example-greenhouse",
  companyName: "ExampleCo",
  careersUrl: "https://boards.greenhouse.io/exampleco",
  provider: "GREENHOUSE",
  domains: ["SOFTWARE"],
  locations: ["Bengaluru", "Remote"],
  roleKeywords: ["backend", "software"]
};

describe("profile discovery service", () => {
  it("stores the shared source pool but returns only profile-eligible jobs", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const jobRepository = new InMemoryJobRepository();
    const userId = "user_1";
    const profile = await profileRepository.create(userId, {
      name: "Backend SDE",
      domain: "SOFTWARE",
      graduationYear: 2027,
      experienceMonths: 0,
      preferredRoles: ["Backend Engineer"],
      preferredLocations: ["Bengaluru"],
      preferredWorkModes: ["HYBRID", "REMOTE"],
      targetCompanies: [],
      excludedCompanies: [],
      includedKeywords: [],
      excludedKeywords: [],
      skills: ["Node.js", "TypeScript"],
      seeksEmploymentTypes: ["FULL_TIME"]
    });
    const fetcher: CareerPageFetcher = {
      async fetchJobs() {
        return [
          {
            companyName: "ExampleCo",
            title: "Backend Engineer New Grad",
            description: "New grad backend role using Node.js and TypeScript in Bengaluru. Hybrid role.",
            sourceUrl: "https://boards.greenhouse.io/exampleco/jobs/1",
            locations: ["Bengaluru"]
          },
          {
            companyName: "ExampleCo",
            title: "Senior Backend Engineer",
            description: "Requires 5 years of backend engineering experience with Node.js.",
            sourceUrl: "https://boards.greenhouse.io/exampleco/jobs/2",
            locations: ["Bengaluru"]
          }
        ];
      }
    };
    const sourceRepository = new InMemoryDiscoverySourceRepository([source]);
    const service = new ProfileDiscoveryService(profileRepository, jobRepository, fetcher, sourceRepository, []);

    const summary = await service.discoverForProfile(userId, profile.id);
    const storedJobs = await jobRepository.findAll();

    assert.equal(summary.checked, 1);
    assert.equal(summary.created, 1);
    assert.equal(summary.globallyCreated, 2);
    assert.equal(summary.skippedIneligible, 1);
    assert.equal(summary.sources[0]?.stored, 1);
    assert.equal(storedJobs.length, 2);
    assert.equal(summary.jobs[0]?.title, "Backend Engineer New Grad");
  });

  it("continues when one discovery source fails", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const jobRepository = new InMemoryJobRepository();
    const userId = "user_1";
    const profile = await profileRepository.create(userId, {
      name: "Backend SDE",
      domain: "SOFTWARE",
      experienceMonths: 0,
      preferredRoles: ["Backend Engineer"],
      preferredLocations: ["Remote"],
      preferredWorkModes: ["REMOTE"],
      targetCompanies: [],
      excludedCompanies: [],
      includedKeywords: [],
      excludedKeywords: [],
      skills: ["Node.js"],
      seeksEmploymentTypes: ["FULL_TIME"]
    });
    const secondSource: DiscoverySource = {
      ...source,
      id: "second-source",
      companyName: "SecondCo"
    };
    const fetcher: CareerPageFetcher = {
      async fetchJobs(watch) {
        if (watch.companyName === "ExampleCo") {
          throw new Error("platform unavailable");
        }

        return [
          {
            companyName: watch.companyName,
            title: "Remote Backend Engineer",
            description: "Remote backend role with Node.js.",
            sourceUrl: "https://boards.greenhouse.io/secondco/jobs/1",
            locations: ["Remote"]
          }
        ];
      }
    };
    const service = new ProfileDiscoveryService(
      profileRepository,
      jobRepository,
      fetcher,
      new InMemoryDiscoverySourceRepository([source, secondSource]),
      []
    );

    const summary = await service.discoverForProfile(userId, profile.id);

    assert.equal(summary.checked, 2);
    assert.equal(summary.failed, 1);
    assert.equal(summary.created, 1);
    assert.equal(summary.sources[0]?.failed, true);
    assert.equal(summary.sources[1]?.stored, 1);
  });

  it("limits concurrent source scans to stay within the worker memory budget", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const jobRepository = new InMemoryJobRepository();
    const userId = "user_1";
    const profile = await profileRepository.create(userId, {
      name: "Backend SDE",
      domain: "SOFTWARE",
      experienceMonths: 0,
      preferredRoles: ["Backend Engineer"],
      preferredLocations: ["Remote"],
      preferredWorkModes: ["REMOTE"],
      targetCompanies: [],
      excludedCompanies: [],
      includedKeywords: [],
      excludedKeywords: [],
      skills: ["Node.js"],
      seeksEmploymentTypes: ["FULL_TIME"]
    });
    const sources = Array.from({ length: 6 }, (_, index): DiscoverySource => ({
      ...source,
      id: `source-${index}`,
      companyName: `Company ${index}`
    }));
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    const fetcher: CareerPageFetcher = {
      async fetchJobs() {
        activeRequests += 1;
        maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
        await new Promise((resolve) => setTimeout(resolve, 10));
        activeRequests -= 1;
        return [];
      }
    };
    const service = new ProfileDiscoveryService(
      profileRepository,
      jobRepository,
      fetcher,
      new InMemoryDiscoverySourceRepository(sources),
      []
    );

    const summary = await service.discoverForProfile(userId, profile.id);

    assert.equal(summary.checked, 6);
    assert.equal(maximumActiveRequests <= 3, true);
    assert.deepEqual(summary.sources.map((result) => result.sourceId), sources.map((candidate) => candidate.id));
  });
});
