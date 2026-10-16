import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CareerProfile } from "@roleradar/domain";

import { selectDiscoverySources, type DiscoverySource } from "./source-registry.js";

describe("discovery source registry", () => {
  it("does not discard matching-domain sources based on source-level location guesses", () => {
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
      domains: ["DIGITAL_HARDWARE"],
      locations: ["USA"],
      roleKeywords: ["verification"]
    };

    assert.deepEqual(selectDiscoverySources(profile, [source]), [source]);
  });
});
