import express, { type Express } from "express";

import { createAuthMiddleware } from "./auth/auth.middleware.js";
import { createAuthRouter } from "./auth/auth.routes.js";
import { AuthService } from "./auth/auth.service.js";
import { PrismaRefreshSessionRepository, type RefreshSessionRepository } from "./auth/refresh-session.repository.js";
import { PrismaUserRepository, type UserRepository } from "./auth/user.repository.js";
import { PrismaCompanyWatchRepository, type CompanyWatchRepository } from "./company-watches/company-watch.repository.js";
import { createCompanyWatchRouter } from "./company-watches/company-watch.routes.js";
import { CompanyWatchService } from "./company-watches/company-watch.service.js";
import { createProfileDiscoveryRouter } from "./discovery/profile-discovery.routes.js";
import {
  PrismaDiscoverySourceRepository,
  type DiscoverySourceRepository
} from "./discovery/discovery-source.repository.js";
import { ProfileDiscoveryService } from "./discovery/profile-discovery.service.js";
import { PrismaNotificationRepository, type NotificationRepository } from "./notifications/notification.repository.js";
import { createNotificationRouter } from "./notifications/notification.routes.js";
import { NotificationService } from "./notifications/notification.service.js";
import { createJobIngestionRouter } from "./ingestion/job-ingestion.routes.js";
import { JobIngestionService } from "./ingestion/job-ingestion.service.js";
import { PrismaJobStateRepository, type JobStateRepository } from "./job-states/job-state.repository.js";
import { createJobStateRouter } from "./job-states/job-state.routes.js";
import { JobStateService } from "./job-states/job-state.service.js";
import { createJobRouter } from "./jobs/job.routes.js";
import { PrismaJobRepository, type JobRepository } from "./jobs/job.repository.js";
import { JobService } from "./jobs/job.service.js";
import { createProfileRouter } from "./profiles/profile.routes.js";
import { PrismaProfileRepository, type ProfileRepository } from "./profiles/profile.repository.js";
import { ProfileService } from "./profiles/profile.service.js";
import { createRecommendationRouter } from "./recommendations/recommendation.routes.js";
import { RecommendationService } from "./recommendations/recommendation.service.js";
import { PrismaResumeRepository, type ResumeRepository } from "./resumes/resume.repository.js";
import { createResumeRouter } from "./resumes/resume.routes.js";
import { ResumeService } from "./resumes/resume.service.js";
import { createResumeFileStorageFromEnv, type ResumeFileStorage } from "./resumes/resume-file-storage.js";
import { createScheduledDiscoveryRouter } from "./scheduling/scheduled-discovery.routes.js";
import { ScheduledDiscoveryService } from "./scheduling/scheduled-discovery.service.js";
import { createCorsMiddleware } from "./shared/cors.js";
import { errorHandler } from "./shared/error-handler.js";
import { prisma } from "./shared/prisma.js";
import { securityHeaders } from "./shared/security-headers.js";
import { PlatformCareerPageFetcher, type CareerPageFetcher } from "./watch-checker/career-page-fetcher.js";
import { WatchCheckerService } from "./watch-checker/watch-checker.service.js";

export interface AppDependencies {
  companyWatchRepository?: CompanyWatchRepository;
  jobRepository?: JobRepository;
  jobStateRepository?: JobStateRepository;
  profileRepository?: ProfileRepository;
  resumeRepository?: ResumeRepository;
  resumeFileStorage?: ResumeFileStorage;
  refreshSessionRepository?: RefreshSessionRepository;
  notificationRepository?: NotificationRepository;
  userRepository?: UserRepository;
  careerPageFetcher?: CareerPageFetcher;
  discoverySourceRepository?: DiscoverySourceRepository;
  readinessCheck?: () => Promise<void>;
  jwtSecret?: string;
}

export function createApp(dependencies: AppDependencies = {}): Express {
  const app = express();
  const userRepository = dependencies.userRepository ?? new PrismaUserRepository(prisma);
  const refreshSessionRepository = dependencies.refreshSessionRepository ?? new PrismaRefreshSessionRepository(prisma);
  const notificationRepository = dependencies.notificationRepository ?? new PrismaNotificationRepository(prisma);
  const companyWatchRepository = dependencies.companyWatchRepository ?? new PrismaCompanyWatchRepository(prisma);
  const jobRepository = dependencies.jobRepository ?? new PrismaJobRepository(prisma);
  const jobStateRepository = dependencies.jobStateRepository ?? new PrismaJobStateRepository(prisma);
  const profileRepository = dependencies.profileRepository ?? new PrismaProfileRepository(prisma);
  const resumeRepository = dependencies.resumeRepository ?? new PrismaResumeRepository(prisma);
  const resumeFileStorage = dependencies.resumeFileStorage ?? createResumeFileStorageFromEnv();
  const careerPageFetcher = dependencies.careerPageFetcher ?? new PlatformCareerPageFetcher();
  const discoverySourceRepository =
    dependencies.discoverySourceRepository ?? new PrismaDiscoverySourceRepository(prisma);
  const readinessCheck = dependencies.readinessCheck ?? checkDatabaseReadiness;
  const authService = new AuthService(
    userRepository,
    refreshSessionRepository,
    dependencies.jwtSecret ?? requiredEnv("JWT_SECRET"),
    process.env.GOOGLE_CLIENT_ID
  );
  const authenticate = createAuthMiddleware(authService);
  const jobStateService = new JobStateService(profileRepository, jobRepository, jobStateRepository);
  const watchCheckerService = new WatchCheckerService(
    companyWatchRepository,
    jobRepository,
    careerPageFetcher,
    profileRepository
  );
  const companyWatchService = new CompanyWatchService(profileRepository, companyWatchRepository, watchCheckerService);
  const profileDiscoveryService = new ProfileDiscoveryService(
    profileRepository,
    jobRepository,
    careerPageFetcher,
    discoverySourceRepository
  );
  const jobIngestionService = new JobIngestionService(profileRepository, jobRepository);
  const jobService = new JobService(jobRepository);
  const profileService = new ProfileService(profileRepository);
  const recommendationService = new RecommendationService(profileRepository, jobRepository, jobStateRepository);
  const resumeService = new ResumeService(profileRepository, resumeRepository);
  const notificationService = new NotificationService(notificationRepository);
  const scheduledDiscoveryService = new ScheduledDiscoveryService(
    profileRepository,
    watchCheckerService,
    profileDiscoveryService,
    notificationRepository,
    jobRepository
  );

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(securityHeaders);
  app.use(createCorsMiddleware(process.env.CORS_ORIGIN));
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "roleradar-api"
    });
  });

  app.get("/ready", async (_request, response) => {
    try {
      await readinessCheck();
      response.status(200).json({ status: "ready", service: "roleradar-api", database: "reachable" });
    } catch {
      response.status(503).json({ status: "not_ready", service: "roleradar-api", database: "unreachable" });
    }
  });

  app.get("/api/v1", (_request, response) => {
    response.status(200).json({
      name: "RoleRadar API",
      version: "v1"
    });
  });

  app.use("/api/v1/auth", createAuthRouter(authService, authenticate));
  app.use("/api/v1/notifications", createNotificationRouter(notificationService, authenticate));
  app.use("/api/v1/jobs", createJobRouter(jobService, authenticate));
  app.use(
    "/api/v1/profiles/:profileId/recommendations",
    createRecommendationRouter(recommendationService, authenticate)
  );
  app.use("/api/v1/profiles/:profileId/jobs", createJobStateRouter(jobStateService, authenticate));
  app.use("/api/v1/profiles/:profileId/resumes", createResumeRouter(resumeService, resumeFileStorage, authenticate));
  app.use("/api/v1/profiles/:profileId/company-watches", createCompanyWatchRouter(companyWatchService, authenticate));
  app.use("/api/v1/profiles/:profileId/discovery", createProfileDiscoveryRouter(profileDiscoveryService, authenticate));
  app.use("/api/v1/profiles/:profileId/ingestion", createJobIngestionRouter(jobIngestionService, authenticate));
  app.use("/api/v1/profiles", createProfileRouter(profileService, authenticate));
  app.use("/api/v1/internal/schedules", createScheduledDiscoveryRouter(scheduledDiscoveryService, process.env.CRON_SECRET));
  app.use(errorHandler);

  return app;
}

async function checkDatabaseReadiness(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} environment variable is required`);
  }

  return value;
}
