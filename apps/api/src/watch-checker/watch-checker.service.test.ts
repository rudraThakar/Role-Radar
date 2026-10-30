import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InMemoryCompanyWatchRepository } from "../company-watches/company-watch.repository.js";
import { InMemoryJobRepository } from "../jobs/job.repository.js";
import {
  extractJobLinks,
  PlatformCareerPageFetcher,
  readBoundedJsonResponse,
  type CareerPageFetcher
} from "./career-page-fetcher.js";
import { WatchCheckerService } from "./watch-checker.service.js";

describe("career page fetcher", () => {
  it("extracts likely job links from HTML", () => {
    const jobs = extractJobLinks(
      {
        id: "watch_1",
        userId: "user_1",
        profileId: "profile_1",
        companyName: "ExampleCo",
        careersUrl: "https://example.com/careers",
        checkCadenceDays: 1,
        isActive: true,
        createdAt: new Date("2026-10-09T00:00:00.000Z")
      },
      `
        <a href="/jobs/backend-new-grad">Backend Engineer New Grad</a>
        <a href="/about">About us</a>
      `
    );

    assert.equal(jobs.length, 1);
    assert.equal(jobs[0]?.sourceUrl, "https://example.com/jobs/backend-new-grad");
  });

  it("does not extract generic developer or product links as jobs", () => {
    const jobs = extractJobLinks(
      {
        id: "watch_1",
        userId: "user_1",
        profileId: "profile_1",
        companyName: "ExampleCo",
        careersUrl: "https://example.com/careers",
        checkCadenceDays: 1,
        isActive: true,
        createdAt: new Date("2026-10-09T00:00:00.000Z")
      },
      `
        <a href="https://developer.example.com/tools">Developer Tools Engineer Guide</a>
        <a href="/software/platform">Software Platform</a>
        <a href="/jobs/backend-engineer-123">Backend Engineer</a>
      `
    );

    assert.equal(jobs.length, 1);
    assert.equal(jobs[0]?.sourceUrl, "https://example.com/jobs/backend-engineer-123");
  });

  it("fetches Greenhouse jobs through the board API", async () => {
    const fetcher = new PlatformCareerPageFetcher(async (url) => {
      assert.equal(String(url), "https://boards-api.greenhouse.io/v1/boards/exampleco/jobs");
      return jsonResponse({
        jobs: [
          {
            title: "Backend Engineer",
            absolute_url: "https://boards.greenhouse.io/exampleco/jobs/1",
            content: "<p>Build APIs with Node.js.</p>",
            location: { name: "Bengaluru" },
            updated_at: "2026-10-09T00:00:00.000Z"
          }
        ]
      });
    });

    const jobs = await fetcher.fetchJobs({
      id: "watch_1",
      userId: "user_1",
      profileId: "profile_1",
      companyName: "ExampleCo",
      careersUrl: "https://boards.greenhouse.io/exampleco",
      checkCadenceDays: 1,
      isActive: true,
      createdAt: new Date("2026-10-09T00:00:00.000Z")
    });

    assert.equal(jobs[0]?.title, "Backend Engineer");
    assert.deepEqual(jobs[0]?.locations, ["Bengaluru"]);
  });

  it("rejects oversized ATS responses before parsing them", async () => {
    const response = new Response(JSON.stringify({ jobs: [{ title: "A very large posting" }] }));

    await assert.rejects(
      readBoundedJsonResponse(response, "Test ATS", 20),
      /Test ATS response exceeds the .* safety limit/
    );
  });

  it("fetches Lever jobs through the postings API", async () => {
    const fetcher = new PlatformCareerPageFetcher(async (url) => {
      assert.equal(String(url), "https://api.lever.co/v0/postings/exampleco?mode=json");
      return jsonResponse([
        {
          text: "Frontend Engineer",
          hostedUrl: "https://jobs.lever.co/exampleco/abc",
          descriptionPlain: "React and TypeScript role.",
          categories: { location: "Remote" },
          createdAt: 1791504000000
        }
      ]);
    });

    const jobs = await fetcher.fetchJobs({
      id: "watch_1",
      userId: "user_1",
      profileId: "profile_1",
      companyName: "ExampleCo",
      careersUrl: "https://jobs.lever.co/exampleco",
      checkCadenceDays: 1,
      isActive: true,
      createdAt: new Date("2026-10-09T00:00:00.000Z")
    });

    assert.equal(jobs[0]?.title, "Frontend Engineer");
    assert.deepEqual(jobs[0]?.locations, ["Remote"]);
  });

  it("fetches Ashby jobs through the job board API", async () => {
    const fetcher = new PlatformCareerPageFetcher(async (url) => {
      assert.equal(String(url), "https://api.ashbyhq.com/posting-api/job-board/exampleco");
      return jsonResponse({
        jobs: [
          {
            title: "RTL Design Engineer",
            jobUrl: "https://jobs.ashbyhq.com/exampleco/123",
            descriptionHtml: "<p>Verilog and RTL role.</p>",
            locationName: "Hyderabad"
          }
        ]
      });
    });

    const jobs = await fetcher.fetchJobs({
      id: "watch_1",
      userId: "user_1",
      profileId: "profile_1",
      companyName: "ExampleCo",
      careersUrl: "https://jobs.ashbyhq.com/exampleco",
      checkCadenceDays: 1,
      isActive: true,
      createdAt: new Date("2026-10-09T00:00:00.000Z")
    });

    assert.equal(jobs[0]?.title, "RTL Design Engineer");
    assert.deepEqual(jobs[0]?.locations, ["Hyderabad"]);
  });

  it("fetches Workday jobs through the common CXS endpoint", async () => {
    const fetcher = new PlatformCareerPageFetcher(async (url, init) => {
      if (String(url).endsWith("/job/embedded-software-engineer")) {
        return jsonResponse({
          jobPostingInfo: {
            title: "Embedded Software Engineer",
            jobDescription: "<p>Build firmware with C++ and an RTOS. No prior experience required.</p>",
            location: "Bengaluru",
            additionalLocations: ["Hyderabad"]
          }
        });
      }

      assert.equal(String(url), "https://example.wd1.myworkdayjobs.com/wday/cxs/example/External/jobs");
      assert.equal(init?.method, "POST");
      assert.equal(JSON.parse(String(init?.body)).limit, 20);
      return jsonResponse({
        jobPostings: [
          {
            title: "Embedded Software Engineer",
            externalPath: "/en-US/External/job/embedded-software-engineer",
            locationsText: "Bengaluru"
          }
        ]
      });
    });

    const jobs = await fetcher.fetchJobs({
      id: "watch_1",
      userId: "user_1",
      profileId: "profile_1",
      companyName: "ExampleCo",
      careersUrl: "https://example.wd1.myworkdayjobs.com/en-US/External",
      checkCadenceDays: 1,
      isActive: true,
      createdAt: new Date("2026-10-09T00:00:00.000Z")
    });

    assert.equal(jobs[0]?.title, "Embedded Software Engineer");
    assert.equal(jobs[0]?.sourceUrl, "https://example.wd1.myworkdayjobs.com/en-US/External/job/embedded-software-engineer");
    assert.deepEqual(jobs[0]?.locations, ["Bengaluru", "Hyderabad"]);
    assert.match(jobs[0]?.description ?? "", /Build firmware/);
  });

  it("paginates Workday results with a bounded page loop", async () => {
    let listingCalls = 0;
    const fetcher = new PlatformCareerPageFetcher(async (url, init) => {
      if (!String(url).endsWith("/jobs")) return jsonResponse({});
      const body = JSON.parse(String(init?.body));
      listingCalls += 1;
      if (body.offset === 0) {
        return jsonResponse({
          total: 21,
          jobPostings: Array.from({ length: 20 }, (_, index) => ({
            title: `Software Engineer ${index}`,
            externalPath: `/en-US/External/job/software-engineer-${index}`,
            locationsText: "Bengaluru"
          }))
        });
      }

      return jsonResponse({
        total: 21,
        jobPostings: [
          {
            title: "Software Engineer 20",
            externalPath: "/en-US/External/job/software-engineer-20",
            locationsText: "Bengaluru"
          }
        ]
      });
    });

    const jobs = await fetcher.fetchJobs({
      id: "watch_1",
      userId: "user_1",
      profileId: "profile_1",
      companyName: "ExampleCo",
      careersUrl: "https://example.wd1.myworkdayjobs.com/en-US/External",
      checkCadenceDays: 1,
      isActive: true,
      createdAt: new Date("2026-10-09T00:00:00.000Z")
    });

    assert.equal(listingCalls, 2);
    assert.equal(jobs.length, 21);
  });

  it("routes known NVIDIA career pages to the Workday board", async () => {
    const fetcher = new PlatformCareerPageFetcher(async (url, init) => {
      if (String(url).includes("/wday/cxs/nvidia/NVIDIAExternalCareerSite/job/")) {
        return jsonResponse({});
      }
      assert.equal(String(url), "https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs");
      assert.equal(init?.method, "POST");
      return jsonResponse({
        jobPostings: [
          {
            title: "GPU Software Engineer",
            externalPath: "/job/US-CA-Santa-Clara/GPU-Software-Engineer_JR123",
            locationsText: "US, CA, Santa Clara"
          }
        ]
      });
    });

    const jobs = await fetcher.fetchJobs({
      id: "watch_1",
      userId: "user_1",
      profileId: "profile_1",
      companyName: "NVIDIA",
      careersUrl: "https://www.nvidia.com/en-in/about-nvidia/careers/",
      checkCadenceDays: 1,
      isActive: true,
      createdAt: new Date("2026-10-09T00:00:00.000Z")
    });

    assert.equal(jobs[0]?.title, "GPU Software Engineer");
    assert.equal(jobs[0]?.sourceUrl, "https://nvidia.wd5.myworkdayjobs.com/job/US-CA-Santa-Clara/GPU-Software-Engineer_JR123");
  });
});

describe("watch checker service", () => {
  it("checks due watches and ingests discovered jobs", async () => {
    const companyWatchRepository = new InMemoryCompanyWatchRepository();
    const jobRepository = new InMemoryJobRepository();
    const fetcher: CareerPageFetcher = {
      async fetchJobs(watch) {
        return [
          {
            companyName: watch.companyName,
            title: "Backend Engineer New Grad",
            description: "New grad backend role using TypeScript and Node.js in Bengaluru.",
            sourceUrl: "https://example.com/jobs/backend-new-grad",
            locations: ["Bengaluru"]
          }
        ];
      }
    };
    const service = new WatchCheckerService(companyWatchRepository, jobRepository, fetcher);

    await companyWatchRepository.create("user_1", "profile_1", {
      companyName: "ExampleCo",
      careersUrl: "https://example.com/careers",
      checkCadenceDays: 1
    });

    const summary = await service.checkDueWatches(new Date("2026-10-09T00:00:00.000Z"));

    assert.equal(summary.checked, 1);
    assert.equal(summary.created, 1);
    assert.equal(summary.jobs[0]?.minimumExperienceMonths, 0);
    const [health] = await companyWatchRepository.findForProfile("user_1", "profile_1");
    assert.equal(health?.consecutiveFailures, 0);
    assert.equal(health?.lastSuccessAt?.toISOString(), "2026-10-09T00:00:00.000Z");
  });

  it("records connector failures without advancing the successful-check checkpoint", async () => {
    const companyWatchRepository = new InMemoryCompanyWatchRepository();
    const service = new WatchCheckerService(companyWatchRepository, new InMemoryJobRepository(), {
      async fetchJobs() {
        throw new Error("Source unavailable");
      }
    });
    await companyWatchRepository.create("user_1", "profile_1", {
      companyName: "ExampleCo",
      careersUrl: "https://example.com/careers",
      checkCadenceDays: 1
    });

    const summary = await service.checkDueWatches(new Date("2026-10-09T00:00:00.000Z"));
    const [health] = await companyWatchRepository.findForProfile("user_1", "profile_1");

    assert.equal(summary.failed, 1);
    assert.equal(health?.consecutiveFailures, 1);
    assert.equal(health?.lastError, "Source unavailable");
    assert.equal(health?.lastCheckedAt, undefined);
  });

  it("skips watches that are not due yet", async () => {
    const companyWatchRepository = new InMemoryCompanyWatchRepository();
    const service = new WatchCheckerService(companyWatchRepository, new InMemoryJobRepository(), {
      async fetchJobs() {
        throw new Error("Should not fetch");
      }
    });
    const watch = await companyWatchRepository.create("user_1", "profile_1", {
      companyName: "ExampleCo",
      careersUrl: "https://example.com/careers",
      checkCadenceDays: 2
    });
    await companyWatchRepository.markChecked(
      watch.userId,
      watch.profileId,
      watch.id,
      new Date("2026-10-08T00:00:00.000Z")
    );

    const summary = await service.checkDueWatches(new Date("2026-10-09T00:00:00.000Z"));

    assert.equal(summary.checked, 0);
    assert.equal(summary.skipped, 1);
  });

  it("checks profile watches immediately without waiting for cadence", async () => {
    const companyWatchRepository = new InMemoryCompanyWatchRepository();
    const jobRepository = new InMemoryJobRepository();
    const service = new WatchCheckerService(companyWatchRepository, jobRepository, {
      async fetchJobs(watch) {
        return [
          {
            companyName: watch.companyName,
            title: "Software Engineer",
            description: "Backend role using Node.js.",
            sourceUrl: "https://example.com/jobs/software-engineer",
            locations: ["Remote"]
          }
        ];
      }
    });
    const watch = await companyWatchRepository.create("user_1", "profile_1", {
      companyName: "ExampleCo",
      careersUrl: "https://example.com/careers",
      checkCadenceDays: 30
    });
    await companyWatchRepository.markChecked(
      watch.userId,
      watch.profileId,
      watch.id,
      new Date("2026-10-10T00:00:00.000Z")
    );

    const summary = await service.checkProfileWatches("user_1", "profile_1", new Date("2026-10-10T01:00:00.000Z"));

    assert.equal(summary.checked, 1);
    assert.equal(summary.skipped, 0);
    assert.equal(summary.created, 1);
  });
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
