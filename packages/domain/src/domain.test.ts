import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildRecommendation,
  buildJobFingerprint,
  canonicalizeJobUrl,
  classifyJobDomain,
  evaluateEligibility,
  roleTitleMatchScore,
  suggestProfileTargetsFromText,
  suggestSkillsFromText
} from "./index.js";
import type { CanonicalJob, CareerProfile } from "./index.js";

const baseJob: CanonicalJob = {
  id: "job_1",
  companyName: "NVIDIA",
  title: "New Grad Backend Software Engineer",
  normalizedTitle: "new grad backend software engineer",
  description: "Entry-level role for 2027 graduates. C++ and Python are preferred.",
  employmentType: "FULL_TIME",
  seniority: "ENTRY_LEVEL",
  domains: ["SOFTWARE"],
  skills: ["C++", "Python"],
  minimumExperienceMonths: 0,
  eligibleGraduationYears: [2027],
  locations: ["Bengaluru"],
  workMode: "HYBRID",
  sourceUrl: "https://example.com/jobs/1",
  applyUrl: "https://example.com/jobs/1/apply",
  discoveredAt: new Date("2026-09-28T00:00:00.000Z"),
  evidence: []
};

const sdeProfile: CareerProfile = {
  id: "profile_sde",
  name: "Backend SDE",
  domain: "SOFTWARE",
  graduationYear: 2027,
  experienceMonths: 0,
  preferredRoles: ["Backend Engineer", "Software Engineer"],
  preferredLocations: ["Bengaluru", "Remote"],
  preferredWorkModes: ["HYBRID", "REMOTE"],
  targetCompanies: ["NVIDIA"],
  excludedCompanies: [],
  includedKeywords: [],
  excludedKeywords: [],
  skills: ["C++", "TypeScript", "Python"],
  seeksEmploymentTypes: ["FULL_TIME"]
};

describe("classifyJobDomain", () => {
  it("detects software jobs from title and description signals", () => {
    const result = classifyJobDomain(baseJob);

    assert.deepEqual(result.domains, ["SOFTWARE"]);
    assert.equal(result.evidence.length > 0, true);
  });

  it("detects mechanical and civil jobs without treating them as software", () => {
    const mechanical = classifyJobDomain({
      ...baseJob,
      title: "Mechanical Design Engineer",
      description: "Design manufacturing tooling using SolidWorks and FEA.",
      skills: ["SolidWorks", "FEA"]
    });
    const civil = classifyJobDomain({
      ...baseJob,
      title: "Civil Structural Engineer",
      description: "Create Revit and AutoCAD models for construction projects.",
      skills: ["Revit", "AutoCAD"]
    });

    assert.deepEqual(mechanical.domains, ["MECHANICAL"]);
    assert.deepEqual(civil.domains, ["CIVIL"]);
  });
});

describe("job identity", () => {
  it("removes tracking parameters without removing job identifiers", () => {
    assert.equal(
      canonicalizeJobUrl("https://boards.greenhouse.io/acme/jobs/123?gh_src=abc&utm_source=linkedin"),
      "https://boards.greenhouse.io/acme/jobs/123"
    );
    assert.equal(
      canonicalizeJobUrl("https://careers.example.com/job?jobSeqNo=ABC123&utm_medium=email"),
      "https://careers.example.com/job?jobSeqNo=ABC123"
    );
  });

  it("builds the same fingerprint regardless of location order", () => {
    const left = buildJobFingerprint({ companyName: "Example Co", normalizedTitle: "backend engineer", locations: ["Pune", "Bengaluru"] });
    const right = buildJobFingerprint({ companyName: "example co", normalizedTitle: "backend engineer", locations: ["Bengaluru", "Pune"] });
    assert.equal(left, right);
  });
});

describe("roleTitleMatchScore", () => {
  it("matches meaningful role terms without relying on the generic engineer token", () => {
    assert.equal(roleTitleMatchScore("Backend Software Engineer", "Backend Engineer"), 1);
    assert.equal(roleTitleMatchScore("Mechanical Design Engineer", "Backend Engineer"), 0);
  });
});

describe("evaluateEligibility", () => {
  it("accepts a fresher-friendly job matching the profile", () => {
    const result = evaluateEligibility(baseJob, sdeProfile);

    assert.equal(result.eligibility, "ELIGIBLE");
    assert.equal(result.reasons.some((reason) => reason.includes("fresher") || reason.includes("entry-level")), true);
  });

  it("rejects jobs requiring more experience than the profile has", () => {
    const result = evaluateEligibility(
      {
        ...baseJob,
        minimumExperienceMonths: 24
      },
      sdeProfile
    );

    assert.equal(result.eligibility, "INELIGIBLE");
    assert.deepEqual(result.reasons, []);
    assert.equal(result.gaps[0], "Required experience is greater than this profile's experience");
  });

  it("rejects explicitly senior roles for fresher profiles without numeric experience metadata", () => {
    const { minimumExperienceMonths: _minimumExperienceMonths, ...jobWithoutExperience } = baseJob;
    const result = evaluateEligibility(
      {
        ...jobWithoutExperience,
        title: "Sr/Staff Backend Engineer",
        normalizedTitle: "sr staff backend engineer",
        seniority: "SENIOR"
      },
      sdeProfile
    );

    assert.equal(result.eligibility, "INELIGIBLE");
    assert.equal(result.gaps[0], "Role title indicates a senior-level position");
  });

  it("rejects jobs with excluded companies", () => {
    const result = evaluateEligibility(baseJob, {
      ...sdeProfile,
      excludedCompanies: ["NVIDIA"]
    });

    assert.equal(result.eligibility, "INELIGIBLE");
    assert.equal(result.gaps[0], "Company is excluded by this profile");
  });

  it("rejects onsite or hybrid jobs outside the profile's preferred locations", () => {
    const result = evaluateEligibility(
      {
        ...baseJob,
        locations: ["San Francisco, USA"]
      },
      {
        ...sdeProfile,
        preferredLocations: ["India", "Remote"],
        citizenshipCountry: "India",
        includeInternationalRoles: true
      }
    );

    assert.equal(result.eligibility, "INELIGIBLE");
    assert.equal(result.gaps[0], "Job location is outside this profile's preferred locations");
  });

  it("allows international jobs when the profile explicitly includes that location", () => {
    const result = evaluateEligibility(
      {
        ...baseJob,
        locations: ["San Francisco, USA"]
      },
      {
        ...sdeProfile,
        preferredLocations: ["India", "USA", "Remote"],
        citizenshipCountry: "India",
        includeInternationalRoles: true
      }
    );

    assert.equal(result.eligibility, "ELIGIBLE");
  });

  it("hides foreign jobs by default for an India-based profile", () => {
    const result = evaluateEligibility(
      {
        ...baseJob,
        locations: ["San Francisco, USA"]
      },
      {
        ...sdeProfile,
        preferredLocations: ["India", "USA", "Remote"],
        citizenshipCountry: "India",
        includeInternationalRoles: false
      }
    );

    assert.equal(result.eligibility, "INELIGIBLE");
    assert.equal(result.gaps[0], "Job is outside this profile's default work-authorization country");
  });

  it("hides US jobs expressed with a city and state abbreviation by default", () => {
    const result = evaluateEligibility(
      { ...baseJob, locations: ["Austin, TX"], workMode: "UNKNOWN" },
      { ...sdeProfile, citizenshipCountry: "India", includeInternationalRoles: false }
    );

    assert.equal(result.eligibility, "INELIGIBLE");
    assert.equal(result.gaps[0], "Job is outside this profile's default work-authorization country");
  });

  it("does not treat a country-specific remote role as globally remote", () => {
    const result = evaluateEligibility(
      { ...baseJob, locations: ["Remote, United States"], workMode: "REMOTE" },
      { ...sdeProfile, citizenshipCountry: "India", includeInternationalRoles: false }
    );

    assert.equal(result.eligibility, "INELIGIBLE");
  });

  it("recognizes Budapest as an international location for an India-based profile", () => {
    const result = evaluateEligibility(
      { ...baseJob, locations: ["Hungary, Budapest"] },
      { ...sdeProfile, citizenshipCountry: "India", includeInternationalRoles: false }
    );

    assert.equal(result.eligibility, "INELIGIBLE");
  });

  it("treats an India preference as matching a known Indian city", () => {
    const result = evaluateEligibility(baseJob, {
      ...sdeProfile,
      preferredLocations: ["India"]
    });

    assert.equal(result.eligibility, "ELIGIBLE");
  });
});

describe("buildRecommendation", () => {
  it("produces a high score for a strong profile match", () => {
    const result = buildRecommendation(baseJob, sdeProfile, new Date("2026-09-28T12:00:00.000Z"));

    assert.equal(result.eligibility, "ELIGIBLE");
    assert.equal(result.score >= 75, true);
    assert.equal(result.scoreVersion, "deterministic-v1");
  });

  it("scores ineligible jobs as zero", () => {
    const result = buildRecommendation(
      {
        ...baseJob,
        eligibleGraduationYears: [2025]
      },
      sdeProfile,
      new Date("2026-09-28T12:00:00.000Z")
    );

    assert.equal(result.eligibility, "INELIGIBLE");
    assert.equal(result.score, 0);
  });
});

describe("suggestSkillsFromText", () => {
  it("extracts deterministic skill suggestions from resume text", () => {
    const suggestions = suggestSkillsFromText("Built backend services with TypeScript, Node.js, PostgreSQL and C++.");

    assert.deepEqual(
      suggestions.map((suggestion) => suggestion.skill),
      ["C++", "Node.js", "PostgreSQL", "TypeScript"]
    );
  });
});

describe("suggestProfileTargetsFromText", () => {
  it("suggests target roles and domains from resume text", () => {
    const suggestions = suggestProfileTargetsFromText(
      "Built REST APIs with Node and Express. Also wrote RTL modules in Verilog."
    );

    assert.deepEqual(
      suggestions.roles.map((suggestion) => suggestion.role),
      ["Backend Engineer", "RTL Design Engineer"]
    );
    assert.deepEqual(
      suggestions.domains.map((suggestion) => suggestion.domain),
      ["DIGITAL_HARDWARE", "SOFTWARE"]
    );
  });
});


describe("work authorization strictness", () => {
  const baseJob = {
    id: "job",
    companyName: "Acme",
    title: "Software Engineer",
    normalizedTitle: "software engineer",
    description: "Build backend services.",
    employmentType: "FULL_TIME",
    seniority: "UNKNOWN",
    domains: ["SOFTWARE"],
    skills: [],
    locations: [] as string[],
    workMode: "UNKNOWN",
    sourceUrl: "https://example.com/jobs/1",
    applyUrl: "https://example.com/jobs/1",
    discoveredAt: new Date(),
    evidence: []
  } as const;
  const profile = {
    id: "p",
    name: "India SDE",
    domain: "SOFTWARE",
    experienceMonths: 0,
    preferredRoles: [],
    preferredLocations: ["India", "Remote"],
    preferredWorkModes: [],
    targetCompanies: [],
    excludedCompanies: [],
    includedKeywords: [],
    excludedKeywords: [],
    skills: [],
    seeksEmploymentTypes: []
  } as const;

  function eligibilityFor(locations: string[], workMode: "REMOTE" | "UNKNOWN" = "UNKNOWN") {
    return buildRecommendation({ ...baseJob, locations, workMode } as never, profile as never).eligibility;
  }

  it("rejects foreign, unrecognised and unstated locations for a home-country profile", () => {
    assert.equal(eligibilityFor(["San Francisco"]), "INELIGIBLE");
    assert.equal(eligibilityFor(["Remote - US"], "REMOTE"), "INELIGIBLE");
    assert.equal(eligibilityFor(["Lisbon, Portugal"]), "INELIGIBLE");
    assert.equal(eligibilityFor(["Somewhere Unknown"]), "INELIGIBLE");
    assert.equal(eligibilityFor([]), "INELIGIBLE");
  });

  it("accepts home-country and location-neutral remote jobs", () => {
    assert.notEqual(eligibilityFor(["Bengaluru, India"]), "INELIGIBLE");
    assert.notEqual(eligibilityFor(["Remote - India"], "REMOTE"), "INELIGIBLE");
    assert.notEqual(eligibilityFor(["Remote"], "REMOTE"), "INELIGIBLE");
    assert.notEqual(eligibilityFor([], "REMOTE"), "INELIGIBLE");
  });
});
