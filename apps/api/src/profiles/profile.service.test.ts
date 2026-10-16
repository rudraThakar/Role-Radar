import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpError } from "../shared/http-error.js";
import { parseCreateProfileInput } from "./profile.dto.js";
import { InMemoryProfileRepository } from "./profile.repository.js";
import { ProfileService } from "./profile.service.js";

describe("profile service", () => {
  it("creates, lists, reads, updates, and deletes a career profile", async () => {
    const service = new ProfileService(new InMemoryProfileRepository());
    const userId = "user_1";

    const created = await service.createProfile(
      userId,
      parseCreateProfileInput({
        name: "Backend SDE",
        domain: "SOFTWARE",
        graduationYear: 2027,
        experienceMonths: 0,
        preferredRoles: ["Backend Engineer"],
        preferredLocations: ["Bengaluru"],
        preferredWorkModes: ["HYBRID", "REMOTE"],
        targetCompanies: ["NVIDIA"],
        skills: ["C++", "TypeScript"],
        seeksEmploymentTypes: ["FULL_TIME"]
      })
    );

    assert.equal(created.name, "Backend SDE");
    assert.equal(created.domain, "SOFTWARE");

    const profiles = await service.listProfiles(userId);
    assert.equal(profiles.length, 1);
    assert.equal(profiles[0]?.id, created.id);

    const found = await service.getProfile(userId, created.id);
    assert.equal(found.id, created.id);

    const updated = await service.updateProfile(userId, created.id, {
      skills: ["C++", "TypeScript", "Node.js"]
    });
    assert.deepEqual(updated.skills, ["C++", "TypeScript", "Node.js"]);

    await service.deleteProfile(userId, created.id);
    await assert.rejects(() => service.getProfile(userId, created.id), HttpError);
  });

  it("does not expose profiles across users", async () => {
    const service = new ProfileService(new InMemoryProfileRepository());

    const created = await service.createProfile(
      "user_1",
      parseCreateProfileInput({
        name: "Backend SDE",
        domain: "SOFTWARE",
        experienceMonths: 0
      })
    );

    assert.deepEqual(await service.listProfiles("user_2"), []);
    await assert.rejects(() => service.getProfile("user_2", created.id), HttpError);
  });

  it("rejects invalid profile input", () => {
    assert.throws(
      () =>
        parseCreateProfileInput({
          name: "",
          domain: "UNKNOWN_DOMAIN",
          experienceMonths: -1
        }),
      HttpError
    );
  });
});
