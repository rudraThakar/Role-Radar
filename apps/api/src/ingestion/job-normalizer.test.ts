import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { inferExperienceRange, normalizeRawJobPosting } from "./job-normalizer.js";

describe("inferExperienceRange", () => {
  it("reads minimum years with plus signs and ranges", () => {
    assert.equal(inferExperienceRange("Requires 4+ years of experience in Java").minimumMonths, 48);
    assert.deepEqual(inferExperienceRange("3-5 years of relevant experience"), { minimumMonths: 36, maximumMonths: 60 });
    assert.equal(inferExperienceRange("Minimum of five years professional experience").minimumMonths, 60);
  });

  it("takes the highest stated requirement", () => {
    const text = "8+ years of software experience, including 2+ years of experience with AWS";
    assert.equal(inferExperienceRange(text).minimumMonths, 96);
  });

  it("ignores durations that are not experience requirements", () => {
    assert.deepEqual(inferExperienceRange("We were founded 15 years ago and have grown rapidly."), {});
    assert.deepEqual(inferExperienceRange("This is a 6 months contract position."), {});
    assert.deepEqual(inferExperienceRange("You will be promoted within 2 years."), {});
  });

  it("ignores preferred qualifications", () => {
    const text = `${"Build services. ".repeat(20)} Basic qualifications: BS degree. Preferred qualifications: 6+ years of experience.`;
    assert.deepEqual(inferExperienceRange(text), {});
  });

  it("treats fresher wording as zero experience", () => {
    assert.equal(inferExperienceRange("Open to freshers and new graduates").minimumMonths, 0);
    assert.equal(inferExperienceRange("0-2 years of experience").minimumMonths, 0);
  });
});

describe("normalizeRawJobPosting seniority", () => {
  const base = { companyName: "Acme", description: "Build things.", sourceUrl: "https://example.com/jobs/1" };

  it("marks senior titles and numbered levels", () => {
    assert.equal(normalizeRawJobPosting({ ...base, title: "Engineering Manager" }).seniority, "SENIOR");
    assert.equal(normalizeRawJobPosting({ ...base, title: "Software Engineer III" }).seniority, "SENIOR");
    assert.equal(normalizeRawJobPosting({ ...base, title: "Software Engineer II" }).seniority, "MID_LEVEL");
  });

  it("does not invent a level when nothing indicates one", () => {
    assert.equal(normalizeRawJobPosting({ ...base, title: "Software Engineer" }).seniority, "UNKNOWN");
  });
});
