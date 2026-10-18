import type { CanonicalJob } from "./job.js";
import { normalizeText } from "./text.js";

const trackingParameters = new Set([
  "fbclid",
  "gclid",
  "gh_src",
  "source",
  "ref",
  "referrer",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term"
]);

export function canonicalizeJobUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";

    for (const key of [...url.searchParams.keys()]) {
      if (trackingParameters.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    url.searchParams.sort();
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return value.trim();
  }
}

export function buildJobFingerprint(job: Pick<CanonicalJob, "companyName" | "normalizedTitle" | "locations">): string {
  const locations = job.locations.map(normalizeText).filter(Boolean).sort();
  return [normalizeText(job.companyName), normalizeText(job.normalizedTitle), locations.join("|")].join("::");
}
