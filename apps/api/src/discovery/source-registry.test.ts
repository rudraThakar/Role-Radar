import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defaultDiscoverySources } from "./source-registry.js";

describe("discovery source registry", () => {
  it("contains verified boards across every supported ATS adapter", () => {
    const providers = new Set(defaultDiscoverySources.map((source) => source.provider));

    assert.equal(providers.has("GREENHOUSE"), true);
    assert.equal(providers.has("LEVER"), true);
    assert.equal(providers.has("ASHBY"), true);
    assert.equal(providers.has("WORKDAY"), true);
    assert.equal(providers.has("HTML"), true);
  });

  it("has unique source ids and career URLs", () => {
    const ids = defaultDiscoverySources.map((source) => source.id);
    const urls = defaultDiscoverySources.map((source) => source.careersUrl);

    assert.equal(new Set(ids).size, ids.length);
    assert.equal(new Set(urls).size, urls.length);
  });

  it("includes sources beyond software-only companies", () => {
    const coveredDomains = new Set(defaultDiscoverySources.flatMap((source) => source.domains));

    assert.equal(coveredDomains.has("DIGITAL_HARDWARE"), true);
    assert.equal(coveredDomains.has("EMBEDDED"), true);
    assert.equal(coveredDomains.has("MECHANICAL"), true);
    assert.equal(coveredDomains.has("RESEARCH"), true);
  });
});
