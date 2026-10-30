import { randomUUID } from "node:crypto";

import type { Request, Response } from "express";

import { HttpError } from "../shared/http-error.js";
import type { ScheduledDiscoveryService } from "./scheduled-discovery.service.js";

type RunStatus = "RUNNING" | "COMPLETED" | "FAILED";

interface ScheduledRun {
  id: string;
  status: RunStatus;
  startedAt: Date;
  completedAt?: Date;
  summary?: Awaited<ReturnType<ScheduledDiscoveryService["run"]>>;
  error?: string;
}

export class ScheduledDiscoveryController {
  private currentRun: ScheduledRun | undefined;

  constructor(
    private readonly scheduledDiscoveryService: ScheduledDiscoveryService,
    private readonly cronSecret: string | undefined
  ) {}

  async start(request: Request, response: Response): Promise<void> {
    this.requireCronSecret(request);

    if (this.currentRun?.status === "RUNNING") {
      response.status(202).json({ data: toPublicRun(this.currentRun) });
      return;
    }

    const run: ScheduledRun = {
      id: randomUUID(),
      status: "RUNNING",
      startedAt: new Date()
    };
    this.currentRun = run;
    void this.execute(run);
    response.status(202).json({ data: toPublicRun(run) });
  }

  async status(request: Request, response: Response): Promise<void> {
    this.requireCronSecret(request);
    const runId = request.params.runId;
    if (runId === undefined || this.currentRun?.id !== runId) {
      throw new HttpError(404, "Scheduled discovery run not found");
    }
    response.status(200).json({ data: toPublicRun(this.currentRun) });
  }

  private async execute(run: ScheduledRun): Promise<void> {
    try {
      run.summary = await this.scheduledDiscoveryService.run();
      run.status = "COMPLETED";
    } catch (error) {
      run.status = "FAILED";
      run.error = error instanceof Error ? error.message : "Unknown scheduled discovery error";
    } finally {
      run.completedAt = new Date();
    }
  }

  private requireCronSecret(request: Request): void {
    if (this.cronSecret === undefined || request.header("x-cron-secret") !== this.cronSecret) {
      throw new HttpError(401, "Valid cron secret is required");
    }
  }
}

function toPublicRun(run: ScheduledRun) {
  return {
    runId: run.id,
    status: run.status,
    startedAt: run.startedAt,
    ...(run.completedAt === undefined ? {} : { completedAt: run.completedAt }),
    ...(run.summary === undefined ? {} : { summary: run.summary }),
    ...(run.error === undefined ? {} : { error: run.error })
  };
}
