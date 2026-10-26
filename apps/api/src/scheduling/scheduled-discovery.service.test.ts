import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type ProfileDiscoveryService } from "../discovery/profile-discovery.service.js";
import { InMemoryJobRepository } from "../jobs/job.repository.js";
import { InMemoryNotificationRepository } from "../notifications/notification.repository.js";
import { InMemoryProfileRepository } from "../profiles/profile.repository.js";
import { type WatchCheckerService } from "../watch-checker/watch-checker.service.js";
import { ScheduledDiscoveryService } from "./scheduled-discovery.service.js";

describe("scheduled discovery service", () => {
  it("scans the shared source catalog once for multiple profiles", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const profileInput = {
      name: "Engineer",
      domain: "SOFTWARE" as const,
      experienceMonths: 0,
      preferredRoles: ["Software Engineer"],
      preferredLocations: ["Bengaluru"],
      preferredWorkModes: ["HYBRID" as const],
      targetCompanies: [],
      excludedCompanies: [],
      includedKeywords: [],
      excludedKeywords: [],
      skills: ["TypeScript"],
      seeksEmploymentTypes: ["FULL_TIME" as const]
    };
    await profileRepository.create("user_1", profileInput);
    await profileRepository.create("user_2", { ...profileInput, name: "Frontend Engineer" });
    let globalScans = 0;
    const service = new ScheduledDiscoveryService(
      profileRepository,
      {
        async checkDueProfileWatches() {
          return { checked: 0, skipped: 0, created: 0, updated: 0, failed: 0, jobs: [] };
        }
      } as unknown as WatchCheckerService,
      {
        async discoverAllSources() {
          globalScans += 1;
          return { checked: 1, created: 0, updated: 0, failed: 0, jobs: [], sources: [] };
        }
      } as unknown as ProfileDiscoveryService,
      new InMemoryNotificationRepository(),
      new InMemoryJobRepository()
    );

    const summary = await service.run();

    assert.equal(globalScans, 1);
    assert.equal(summary.profilesChecked, 2);
  });

  it("creates an in-app notification when scheduled discovery finds new profile matches", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const notificationRepository = new InMemoryNotificationRepository();
    const profile = await profileRepository.create("user_1", {
      name: "Backend SDE",
      domain: "SOFTWARE",
      experienceMonths: 0,
      preferredRoles: ["Backend Engineer"],
      preferredLocations: ["Bengaluru"],
      preferredWorkModes: ["HYBRID"],
      targetCompanies: [],
      excludedCompanies: [],
      includedKeywords: [],
      excludedKeywords: [],
      skills: ["Node.js"],
      seeksEmploymentTypes: ["FULL_TIME"]
    });
    const service = new ScheduledDiscoveryService(
      profileRepository,
      {
        async checkDueProfileWatches() {
          return { checked: 0, skipped: 0, created: 1, updated: 0, failed: 0, jobs: [] };
        }
      } as unknown as WatchCheckerService,
      {
        async discoverAllSources() {
          return {
            checked: 1,
            created: 2,
            updated: 0,
            failed: 0,
            jobs: [
              {
                created: true,
                job: {
                  id: "job_1",
                  companyName: "Example",
                  title: "Backend Engineer",
                  normalizedTitle: "backend engineer",
                  description: "Entry level Node.js backend engineer role in Bengaluru.",
                  employmentType: "FULL_TIME",
                  seniority: "ENTRY_LEVEL",
                  domains: ["SOFTWARE"],
                  skills: ["Node.js"],
                  locations: ["Bengaluru"],
                  workMode: "HYBRID",
                  sourceUrl: "https://example.com/jobs/1",
                  applyUrl: "https://example.com/jobs/1",
                  discoveredAt: new Date(),
                  evidence: []
                }
              },
              {
                created: true,
                job: {
                  id: "job_2",
                  companyName: "Example",
                  title: "Senior Mechanical Engineer",
                  normalizedTitle: "senior mechanical engineer",
                  description: "Senior mechanical role requiring 8 years experience.",
                  employmentType: "FULL_TIME",
                  seniority: "SENIOR",
                  domains: ["MECHANICAL"],
                  skills: [],
                  locations: ["Bengaluru"],
                  workMode: "ONSITE",
                  sourceUrl: "https://example.com/jobs/2",
                  applyUrl: "https://example.com/jobs/2",
                  discoveredAt: new Date(),
                  evidence: []
                }
              }
            ],
            sources: []
          };
        }
      } as unknown as ProfileDiscoveryService,
      notificationRepository,
      new InMemoryJobRepository()
    );

    const summary = await service.run();
    const notifications = await notificationRepository.listForUser("user_1");

    assert.equal(summary.profilesChecked, 1);
    assert.equal(summary.created, 3);
    assert.equal(summary.notificationsCreated, 1);
    assert.equal(summary.expired, 0);
    assert.equal(notifications[0]?.profileId, profile.id);
    assert.equal(notifications[0]?.jobCount, 2);
  });
});
