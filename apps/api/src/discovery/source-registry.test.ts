import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CareerProfile } from "@roleradar/domain";

import { selectDiscoverySources, type DiscoverySource } from "./source-registry.js";

describe("discovery source registry", () => {
  it("checks every non-excluded platform source and defers relevance to job-level matching", () => {
    const profile: CareerProfile = {
      id: "profile_1",
      name: "RTL Design Engineer",
      domain: "DIGITAL_HARDWARE",
      experienceMonths: 0,
      preferredRoles: ["RTL Design Engineer"],
      preferredLocations: ["Bengaluru"],
      preferredWorkModes: ["HYBRID"],
      targetCompanies: [],
      excludedCompanies: [],
      includedKeywords: [],
      excludedKeywords: [],
      skills: ["Verilog"],
      seeksEmploymentTypes: ["FULL_TIME"]
    };
    const source: DiscoverySource = {
      id: "hardware-board",
      companyName: "HardwareCo",
      careersUrl: "https://boards.greenhouse.io/hardwareco",
      provider: "GREENHOUSE",
      domains: ["SOFTWARE"],
      locations: ["USA"],
      roleKeywords: ["verification"]
    };

    assert.deepEqual(selectDiscoverySources(profile, [source]), [source]);
  });

  it("does not check sources excluded by the active profile", () => {
    const profile: CareerProfile = {
      id: "profile_1",
      name: "RTL Design Engineer",
      domain: "DIGITAL_HARDWARE",
      experienceMonths: 0,
      preferredRoles: ["RTL Design Engineer"],
      preferredLocations: ["Bengaluru"],
      preferredWorkModes: ["HYBRID"],
      targetCompanies: [],
      excludedCompanies: ["HardwareCo"],
      includedKeywords: [],
      excludedKeywords: [],
      skills: ["Verilog"],
      seeksEmploymentTypes: ["FULL_TIME"]
    };
    const source: DiscoverySource = {
      id: "hardware-board",
      companyName: "HardwareCo",
      careersUrl: "https://boards.greenhouse.io/hardwareco",
      provider: "GREENHOUSE",
      domains: ["SOFTWARE"],
      locations: ["USA"],
      roleKeywords: ["verification"]
    };

    assert.deepEqual(selectDiscoverySources(profile, [source]), []);
  });
});
