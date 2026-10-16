import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { HttpError } from "../shared/http-error.js";
import { createResumeFileStorageFromEnv } from "./resume-file-storage.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_RESUME_BUCKET;
});

test("uploads resume buffers to Supabase Storage", async () => {
  process.env.SUPABASE_URL = "https://project.supabase.co/";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
  process.env.SUPABASE_RESUME_BUCKET = "resumes";
  let uploadUrl: string | undefined;
  let contentType: string | null = null;

  globalThis.fetch = async (input, init) => {
    uploadUrl = String(input);
    const headers = new Headers(init?.headers);
    contentType = headers.get("content-type");
    assert.equal(headers.get("authorization"), "Bearer sb_secret_test");
    assert.equal(headers.get("apikey"), "sb_secret_test");
    assert.equal(headers.get("x-upsert"), "false");
    assert.equal(init?.method, "POST");
    assert.equal(init?.body instanceof Blob, true);

    return new Response("{}", { status: 200 });
  };

  const storageKey = await createResumeFileStorageFromEnv().upload({
    buffer: Buffer.from("%PDF-1.7"),
    checksumSha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    mimeType: "application/pdf",
    originalFilename: "Rudra Resume.pdf",
    profileId: "profile_1",
    userId: "user_1"
  });

  assert.equal(contentType, "application/pdf");
  assert.equal(uploadUrl?.startsWith("https://project.supabase.co/storage/v1/object/resumes/resumes/user_1/profile_1/"), true);
  assert.equal(storageKey.startsWith("supabase://resumes/resumes/user_1/profile_1/"), true);
  assert.equal(storageKey.endsWith("-rudra-resume.pdf"), true);
});

test("rejects resume uploads when Supabase storage is not configured", async () => {
  await assert.rejects(
    () =>
      createResumeFileStorageFromEnv().upload({
        buffer: Buffer.from("%PDF-1.7"),
        checksumSha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        mimeType: "application/pdf",
        originalFilename: "resume.pdf",
        profileId: "profile_1",
        userId: "user_1"
      }),
    (error: unknown) => error instanceof HttpError && error.statusCode === 503
  );
});
