import type { ProfileRepository } from "../profiles/profile.repository.js";
import { HttpError } from "../shared/http-error.js";
import type { WatchCheckerService, WatchCheckSummary } from "../watch-checker/watch-checker.service.js";
import type { BulkCreateCompanyWatchesInput, CreateCompanyWatchInput } from "./company-watch.dto.js";
import type { CompanyWatchRepository } from "./company-watch.repository.js";
import type { CompanyWatch } from "./company-watch.types.js";

export class CompanyWatchService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly companyWatchRepository: CompanyWatchRepository,
    private readonly watchCheckerService?: WatchCheckerService
  ) {}

  async listCompanyWatches(userId: string, profileId: string): Promise<CompanyWatch[]> {
    await this.ensureProfileOwnership(userId, profileId);
    return this.companyWatchRepository.findForProfile(userId, profileId);
  }

  async createCompanyWatch(userId: string, profileId: string, input: CreateCompanyWatchInput): Promise<CompanyWatch> {
    await this.ensureProfileOwnership(userId, profileId);
    return this.companyWatchRepository.create(userId, profileId, input);
  }

  async bulkCreateCompanyWatches(
    userId: string,
    profileId: string,
    input: BulkCreateCompanyWatchesInput
  ): Promise<{ imported: number; watches: CompanyWatch[] }> {
    await this.ensureProfileOwnership(userId, profileId);
    const watches: CompanyWatch[] = [];

    for (const watchInput of input.watches) {
      watches.push(await this.companyWatchRepository.create(userId, profileId, watchInput));
    }

    return {
      imported: watches.length,
      watches
    };
  }

  async deleteCompanyWatch(userId: string, profileId: string, watchId: string): Promise<void> {
    await this.ensureProfileOwnership(userId, profileId);
    const deleted = await this.companyWatchRepository.delete(userId, profileId, watchId);
    if (!deleted) {
      throw new HttpError(404, "Company watch not found");
    }
  }

  async markChecked(userId: string, profileId: string, watchId: string): Promise<CompanyWatch> {
    await this.ensureProfileOwnership(userId, profileId);
    const watch = await this.companyWatchRepository.markChecked(userId, profileId, watchId, new Date());
    if (watch === null) {
      throw new HttpError(404, "Company watch not found");
    }

    return watch;
  }

  async checkNow(userId: string, profileId: string): Promise<WatchCheckSummary> {
    await this.ensureProfileOwnership(userId, profileId);
    if (this.watchCheckerService === undefined) {
      throw new HttpError(503, "Company watch checker is not configured");
    }

    return this.watchCheckerService.checkProfileWatches(userId, profileId);
  }

  private async ensureProfileOwnership(userId: string, profileId: string): Promise<void> {
    const profile = await this.profileRepository.findById(userId, profileId);
    if (profile === null) {
      throw new HttpError(404, "Profile not found");
    }
  }
}
