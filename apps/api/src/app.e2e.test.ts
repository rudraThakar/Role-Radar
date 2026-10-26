import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

import { InMemoryRefreshSessionRepository } from "./auth/refresh-session.repository.js";
import { InMemoryUserRepository } from "./auth/user.repository.js";
import { InMemoryCompanyWatchRepository } from "./company-watches/company-watch.repository.js";
import { InMemoryDiscoverySourceRepository } from "./discovery/discovery-source.repository.js";
import { InMemoryJobStateRepository } from "./job-states/job-state.repository.js";
import { InMemoryJobRepository } from "./jobs/job.repository.js";
import { InMemoryNotificationRepository } from "./notifications/notification.repository.js";
import { InMemoryProfileRepository } from "./profiles/profile.repository.js";
import { InMemoryResumeRepository } from "./resumes/resume.repository.js";
import type { ResumeFileStorage } from "./resumes/resume-file-storage.js";
import type { CareerPageFetcher } from "./watch-checker/career-page-fetcher.js";
import { createApp } from "./app.js";

const storedResumeKeys: string[] = [];
const resumeFileStorage: ResumeFileStorage = {
  async upload(input) {
    const key = `test://resumes/${input.userId}/${input.profileId}/${input.originalFilename}`;
    storedResumeKeys.push(key);
    return key;
  }
};
const careerPageFetcher: CareerPageFetcher = {
  async fetchJobs() {
    return [
      {
        companyName: "Acme India",
        title: "Junior Backend Engineer",
        description:
          "Entry-level backend software engineer role using Node.js, TypeScript and PostgreSQL. Fresh graduates may apply.",
        sourceUrl: "https://careers.acme.example/jobs/backend-engineer-india",
        applyUrl: "https://careers.acme.example/jobs/backend-engineer-india",
        locations: ["Bengaluru, India"],
        skills: ["Node.js", "TypeScript", "PostgreSQL"]
      }
    ];
  }
};
const discoverySourceRepository = new InMemoryDiscoverySourceRepository([
  {
    id: "acme-test",
    companyName: "Acme India",
    careersUrl: "https://careers.acme.example/jobs",
    provider: "HTML",
    domains: ["SOFTWARE"],
    locations: ["Bengaluru"],
    roleKeywords: ["backend"]
  }
]);

const app = createApp({
  careerPageFetcher,
  discoverySourceRepository,
  companyWatchRepository: new InMemoryCompanyWatchRepository(),
  jobRepository: new InMemoryJobRepository(),
  jobStateRepository: new InMemoryJobStateRepository(),
  jwtSecret: "e2e-test-secret-that-is-at-least-32-characters",
  notificationRepository: new InMemoryNotificationRepository(),
  profileRepository: new InMemoryProfileRepository(),
  readinessCheck: async () => undefined,
  refreshSessionRepository: new InMemoryRefreshSessionRepository(),
  resumeFileStorage,
  resumeRepository: new InMemoryResumeRepository(),
  userRepository: new InMemoryUserRepository()
});

let baseUrl = "";
let server: ReturnType<typeof app.listen>;

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
});

test("core user journey works through the HTTP API", async () => {
  const readiness = await request<{ status: string; database: string }>("/ready");
  assert.equal(readiness.status, 200);
  assert.equal(readiness.body.database, "reachable");

  const registration = await request<AuthResult>("/api/v1/auth/register", {
    method: "POST",
    body: {
      email: "journey@example.com",
      password: "correct-horse-battery-staple",
      name: "Journey User"
    }
  });
  assert.equal(registration.status, 201);
  assert.equal(registration.body.data.user.email, "journey@example.com");
  const accessToken = registration.body.data.accessToken;

  const profileResponse = await request<{ data: { id: string; domain: string } }>("/api/v1/profiles", {
    method: "POST",
    accessToken,
    body: {
      name: "Backend SDE",
      domain: "SOFTWARE",
      graduationYear: 2027,
      experienceMonths: 0,
      preferredRoles: ["Backend Engineer"],
      preferredLocations: ["Bengaluru"],
      preferredWorkModes: ["ONSITE", "HYBRID"],
      citizenshipCountry: "India",
      includeInternationalRoles: false,
      targetCompanies: [],
      excludedCompanies: [],
      includedKeywords: [],
      excludedKeywords: [],
      skills: ["Node.js", "TypeScript", "PostgreSQL"],
      seeksEmploymentTypes: ["FULL_TIME"]
    }
  });
  assert.equal(profileResponse.status, 201);
  assert.equal(profileResponse.body.data.domain, "SOFTWARE");
  const profileId = profileResponse.body.data.id;

  const form = new FormData();
  form.set("resume", new Blob(["%PDF-1.4\n% RoleRadar E2E resume"], { type: "application/pdf" }), "resume.pdf");
  const resumeResponse = await fetch(`${baseUrl}/api/v1/profiles/${profileId}/resumes`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
    body: form
  });
  const resumeBody = (await resumeResponse.json()) as { data: { isActive: boolean; originalFilename: string } };
  assert.equal(resumeResponse.status, 201);
  assert.equal(resumeBody.data.originalFilename, "resume.pdf");
  assert.equal(resumeBody.data.isActive, true);
  assert.equal(storedResumeKeys.length, 1);

  const discovery = await request<{ data: { created: number; jobs: Array<{ id: string }> } }>(
    `/api/v1/profiles/${profileId}/discovery/check-now`,
    { method: "POST", accessToken }
  );
  assert.equal(discovery.status, 200);
  assert.equal(discovery.body.data.created, 1);
  assert.equal(discovery.body.data.jobs.length > 0, true);

  const recommendations = await request<{
    data: Array<{ eligibility: string; job: { id: string; title: string; locations: string[] } }>;
  }>(`/api/v1/profiles/${profileId}/recommendations`, { accessToken });
  assert.equal(recommendations.status, 200);
  assert.equal(recommendations.body.data.length, 1);
  assert.equal(recommendations.body.data[0]?.eligibility, "ELIGIBLE");
  assert.match(recommendations.body.data[0]?.job.title ?? "", /Backend Engineer/);
  assert.deepEqual(recommendations.body.data[0]?.job.locations, ["Bengaluru, India"]);
  const jobId = recommendations.body.data[0]?.job.id;
  assert.ok(jobId);

  const saved = await request<{ data: { state: string } }>(`/api/v1/profiles/${profileId}/jobs/${jobId}/save`, {
    method: "POST",
    accessToken
  });
  assert.equal(saved.body.data.state, "SAVED");

  const applied = await request<{ data: { state: string } }>(
    `/api/v1/profiles/${profileId}/jobs/${jobId}/application`,
    {
      method: "PATCH",
      accessToken,
      body: { applicationStage: "INTERVIEWING", applicationNotes: "Technical screen scheduled" }
    }
  );
  assert.equal(applied.body.data.state, "APPLIED");

  const applicationList = await request<{ data: Array<{ applicationStage: string; applicationNotes: string }> }>(
    `/api/v1/profiles/${profileId}/jobs/states?state=APPLIED`,
    { accessToken }
  );
  assert.equal(applicationList.body.data.length, 1);
  assert.equal(applicationList.body.data[0]?.applicationStage, "INTERVIEWING");
  assert.equal(applicationList.body.data[0]?.applicationNotes, "Technical screen scheduled");
});

interface AuthResult {
  data: {
    user: { id: string; email: string };
    accessToken: string;
    refreshToken: string;
  };
}

async function request<TBody>(
  path: string,
  options: { method?: string; accessToken?: string; body?: unknown } = {}
): Promise<{ status: number; body: TBody }> {
  const headers = new Headers();
  if (options.body !== undefined) headers.set("content-type", "application/json");
  if (options.accessToken !== undefined) headers.set("authorization", `Bearer ${options.accessToken}`);

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
  });
  const body = (await response.json()) as TBody;
  return { status: response.status, body };
}
