import { randomUUID } from "node:crypto";

import type { Request, Response } from "express";

import { requireAuthUser } from "../auth/auth.middleware.js";
import { HttpError } from "../shared/http-error.js";
import type { ProfileDiscoveryService, ProfileDiscoverySummary } from "./profile-discovery.service.js";

type RunStatus = "RUNNING" | "COMPLETED" | "FAILED";

interface DiscoveryRun {
  id: string;
  status: RunStatus;
  startedAt: Date;
  completedAt?: Date;
  summary?: Omit<ProfileDiscoverySummary, "jobs"> & { jobs: [] };
  error?: string;
}

const retainedRuns = 20;

export class ProfileDiscoveryController {
  private readonly runs = new Map<string, DiscoveryRun>();

  constructor(private readonly profileDiscoveryService: ProfileDiscoveryService) {}

  async checkNow(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const summary = await this.profileDiscoveryService.discoverForProfile(user.id, requiredProfileId(request));
    response.status(200).json({ data: summary });
  }

  // Scanning every source takes minutes. Holding the HTTP request open exceeds
  // the hosting proxy timeout and the browser reports "Failed to fetch", so the
  // scan runs in the background and clients poll for the result.
  async start(request: Request, response: Response): Promise<void> {
    const user = requireAuthUser(request);
    const profileId = requiredProfileId(request);

    const running = [...this.runs.values()].find((run) => run.status === "RUNNING");
    if (running !== undefined) {
      response.status(202).json({ data: toPublicRun(running) });
      return;
    }

    const run: DiscoveryRun = { id: randomUUID(), status: "RUNNING", startedAt: new Date() };
    this.runs.set(run.id, run);
    while (this.runs.size > retainedRuns) {
      const oldest = this.runs.keys().next().value;
      if (oldest === undefined) break;
      this.runs.delete(oldest);
    }

    void this.execute(run, user.id, profileId);
    response.status(202).json({ data: toPublicRun(run) });
  }

  async status(request: Request, response: Response): Promise<void> {
    requireAuthUser(request);
    const run = this.runs.get(request.params.runId ?? "");
    if (run === undefined) {
      throw new HttpError(404, "Discovery run not found");
    }
    response.status(200).json({ data: toPublicRun(run) });
  }

  private async execute(run: DiscoveryRun, userId: string, profileId: string): Promise<void> {
    try {
      const summary = await this.profileDiscoveryService.discoverForProfile(userId, profileId);
      run.summary = { ...summary, jobs: [] };
      run.status = "COMPLETED";
    } catch (error) {
      run.status = "FAILED";
      run.error = error instanceof Error ? error.message : "Unknown discovery error";
      console.error(`[discovery] run=${run.id} failed: ${run.error}`);
    } finally {
      run.completedAt = new Date();
    }
  }
}

function toPublicRun(run: DiscoveryRun) {
  return {
    runId: run.id,
    status: run.status,
    startedAt: run.startedAt,
    ...(run.completedAt === undefined ? {} : { completedAt: run.completedAt }),
    ...(run.summary === undefined ? {} : { summary: run.summary }),
    ...(run.error === undefined ? {} : { error: run.error })
  };
}

function requiredProfileId(request: Request): string {
  const profileId = request.params.profileId;
  if (profileId === undefined || profileId.trim().length === 0) {
    throw new HttpError(400, "profileId route parameter is required");
  }

  return profileId;
}
