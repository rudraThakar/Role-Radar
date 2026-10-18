import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type ProfileDiscoveryService } from "../discovery/profile-discovery.service.js";
import { InMemoryJobRepository } from "../jobs/job.repository.js";
import { InMemoryNotificationRepository } from "../notifications/notification.repository.js";
import { InMemoryProfileRepository } from "../profiles/profile.repository.js";
import { type WatchCheckerService } from "../watch-checker/watch-checker.service.js";
import { ScheduledDiscoveryService } from "./scheduled-discovery.service.js";

describe("scheduled discovery service", () => {
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
        async discoverForProfile() {
          return {
            checked: 1,
            skippedSources: 0,
            created: 2,
            updated: 0,
            skippedIneligible: 0,
            failed: 0,
            jobs: [],
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
    assert.equal(notifications[0]?.jobCount, 3);
  });
});
