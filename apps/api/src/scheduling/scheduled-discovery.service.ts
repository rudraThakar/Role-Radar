import type { NotificationRepository } from "../notifications/notification.repository.js";
import type { ProfileRepository } from "../profiles/profile.repository.js";
import type { ProfileDiscoveryService } from "../discovery/profile-discovery.service.js";
import type { JobRepository } from "../jobs/job.repository.js";
import type { WatchCheckerService } from "../watch-checker/watch-checker.service.js";

const staleJobWindowMs = 30 * 24 * 60 * 60 * 1000;

export interface ScheduledDiscoverySummary {
  profilesChecked: number;
  created: number;
  updated: number;
  failed: number;
  expired: number;
  notificationsCreated: number;
}

export class ScheduledDiscoveryService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly watchCheckerService: WatchCheckerService,
    private readonly profileDiscoveryService: ProfileDiscoveryService,
    private readonly notificationRepository: NotificationRepository,
    private readonly jobRepository: JobRepository
  ) {}

  async run(now = new Date()): Promise<ScheduledDiscoverySummary> {
    const summary: ScheduledDiscoverySummary = {
      profilesChecked: 0,
      created: 0,
      updated: 0,
      failed: 0,
      expired: 0,
      notificationsCreated: 0
    };

    const globalDiscovery = await this.profileDiscoveryService.discoverAllSources();
    summary.created = globalDiscovery.created;
    summary.updated = globalDiscovery.updated;
    summary.failed = globalDiscovery.failed;

    for (const { userId, profile } of await this.profileRepository.findAllOwned()) {
      summary.profilesChecked += 1;
      const watchSummary = await this.watchCheckerService.checkDueProfileWatches(userId, profile.id, now);
      const newProfileMatches = watchSummary.created;
      summary.created += watchSummary.created;
      summary.updated += watchSummary.updated;
      summary.failed += watchSummary.failed;

      if (newProfileMatches > 0) {
        await this.notificationRepository.create({
          userId,
          profileId: profile.id,
          type: "NEW_MATCHES",
          jobCount: newProfileMatches,
          message: `${newProfileMatches} new matching job${newProfileMatches === 1 ? "" : "s"} found for ${profile.name}.`
        });
        summary.notificationsCreated += 1;
      }
    }

    summary.expired = await this.jobRepository.expireStale(new Date(now.getTime() - staleJobWindowMs), now);

    return summary;
  }
}
