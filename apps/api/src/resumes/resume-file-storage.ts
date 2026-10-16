import { HttpError } from "../shared/http-error.js";

export interface ResumeUploadObject {
  buffer: Buffer;
  checksumSha256: string;
  mimeType: string;
  originalFilename: string;
  profileId: string;
  userId: string;
}

export interface ResumeFileStorage {
  upload(input: ResumeUploadObject): Promise<string>;
}

export function createResumeFileStorageFromEnv(): ResumeFileStorage {
  return new SupabaseResumeFileStorage({
    bucket: process.env.SUPABASE_RESUME_BUCKET,
    secretKey: process.env.SUPABASE_SECRET_KEY,
    url: process.env.SUPABASE_URL
  });
}

interface SupabaseStorageConfig {
  bucket: string | undefined;
  secretKey: string | undefined;
  url: string | undefined;
}

class SupabaseResumeFileStorage implements ResumeFileStorage {
  constructor(private readonly config: SupabaseStorageConfig) {}

  async upload(input: ResumeUploadObject): Promise<string> {
    const config = this.requiredConfig();
    const objectKey = buildObjectKey(input);
    const uploadUrl = `${config.url}/storage/v1/object/${config.bucket}/${objectKey}`;
    const uploadBody = new Uint8Array(input.buffer.byteLength);
    uploadBody.set(input.buffer);
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: config.secretKey,
        authorization: `Bearer ${config.secretKey}`,
        "cache-control": "3600",
        "content-type": input.mimeType,
        "x-upsert": "false"
      },
      body: new Blob([uploadBody], { type: input.mimeType })
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new HttpError(502, details.trim().length === 0 ? "Resume upload failed" : `Resume upload failed: ${details}`);
    }

    return `supabase://${config.bucket}/${objectKey}`;
  }

  private requiredConfig(): { bucket: string; secretKey: string; url: string } {
    const url = this.config.url?.replace(/\/$/, "");
    const bucket = this.config.bucket;
    const secretKey = this.config.secretKey;

    if (
      url === undefined ||
      url.trim().length === 0 ||
      bucket === undefined ||
      bucket.trim().length === 0 ||
      secretKey === undefined ||
      secretKey.trim().length === 0
    ) {
      throw new HttpError(503, "Resume storage is not configured");
    }

    return {
      bucket,
      secretKey,
      url
    };
  }
}

function buildObjectKey(input: ResumeUploadObject): string {
  const safeFilename = input.originalFilename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const filename = safeFilename.endsWith(".pdf") ? safeFilename : `${safeFilename || "resume"}.pdf`;

  return [
    "resumes",
    encodeURIComponent(input.userId),
    encodeURIComponent(input.profileId),
    `${Date.now()}-${input.checksumSha256.slice(0, 16)}-${filename}`
  ].join("/");
}
