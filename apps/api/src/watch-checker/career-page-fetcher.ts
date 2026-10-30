import type { CompanyWatch } from "../company-watches/company-watch.types.js";
import type { RawJobPostingInput } from "../ingestion/ingestion.dto.js";

export interface CareerPageFetcher {
  fetchJobs(watch: CompanyWatch): Promise<RawJobPostingInput[]>;
}

type FetchLike = typeof fetch;
const defaultFetchTimeoutMs = 12_000;
const defaultFetchAttempts = 3;
const initialRetryDelayMs = 200;
const workdayPageSize = 20;
// Workday responses are enriched with full descriptions. Keep the newest 200
// postings bounded so one large tenant cannot exhaust a small worker instance.
const maximumWorkdayPages = 10;
const workdayDetailConcurrency = 5;

interface CareerPlatformAdapter {
  readonly name: string;
  supports(watch: CompanyWatch): boolean;
  fetchJobs(watch: CompanyWatch): Promise<RawJobPostingInput[]>;
}

export class PlatformCareerPageFetcher implements CareerPageFetcher {
  private readonly adapters: CareerPlatformAdapter[];

  constructor(fetcher: FetchLike = fetch, timeoutMs = defaultFetchTimeoutMs) {
    const resilientFetcher = withRetry(withTimeout(fetcher, timeoutMs), defaultFetchAttempts, initialRetryDelayMs);
    const genericFetcher = new GenericCareerPageFetcher(resilientFetcher);
    this.adapters = [
      new GreenhouseAdapter(resilientFetcher),
      new LeverAdapter(resilientFetcher),
      new AshbyAdapter(resilientFetcher),
      new WorkdayAdapter(resilientFetcher, genericFetcher),
      new KnownCareerPageAdapter(resilientFetcher, genericFetcher),
      genericFetcher
    ];
  }

  async fetchJobs(watch: CompanyWatch): Promise<RawJobPostingInput[]> {
    const adapter = this.adapters.find((candidate) => candidate.supports(watch));
    if (adapter === undefined) {
      return [];
    }

    return adapter.fetchJobs(watch);
  }
}

export class GenericCareerPageFetcher implements CareerPageFetcher {
  readonly name = "generic-html";

  constructor(private readonly fetcher: FetchLike = fetch) {}

  supports(_watch: CompanyWatch): boolean {
    return true;
  }

  async fetchJobs(watch: CompanyWatch): Promise<RawJobPostingInput[]> {
    const response = await this.fetcher(watch.careersUrl, {
      headers: {
        "user-agent": "RoleRadarBot/0.1"
      }
    });

    if (!response.ok) {
      throw new Error(`Career page returned ${response.status}`);
    }

    return extractJobLinks(watch, await response.text());
  }
}

class GreenhouseAdapter implements CareerPlatformAdapter {
  readonly name = "greenhouse";

  constructor(private readonly fetcher: FetchLike) {}

  supports(watch: CompanyWatch): boolean {
    return extractGreenhouseBoardToken(watch.careersUrl) !== undefined;
  }

  async fetchJobs(watch: CompanyWatch): Promise<RawJobPostingInput[]> {
    const boardToken = extractGreenhouseBoardToken(watch.careersUrl);
    if (boardToken === undefined) return [];

    const response = await this.fetcher(`https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`);
    if (!response.ok) {
      throw new Error(`Greenhouse returned ${response.status}`);
    }

    const payload = (await response.json()) as GreenhouseJobsResponse;
    return (payload.jobs ?? []).map((job) =>
      withOptionalPublishedAt(
        {
          companyName: watch.companyName,
          title: job.title,
          description: textFromHtml(job.content ?? `${job.title} listed on ${watch.companyName}.`),
          sourceUrl: job.absolute_url,
          applyUrl: job.absolute_url,
          locations: job.location?.name === undefined ? [] : [job.location.name]
        },
        job.updated_at === undefined ? undefined : new Date(job.updated_at)
      )
    );
  }
}

class LeverAdapter implements CareerPlatformAdapter {
  readonly name = "lever";

  constructor(private readonly fetcher: FetchLike) {}

  supports(watch: CompanyWatch): boolean {
    return extractLeverCompanyToken(watch.careersUrl) !== undefined;
  }

  async fetchJobs(watch: CompanyWatch): Promise<RawJobPostingInput[]> {
    const companyToken = extractLeverCompanyToken(watch.careersUrl);
    if (companyToken === undefined) return [];

    const response = await this.fetcher(`https://api.lever.co/v0/postings/${companyToken}?mode=json`);
    if (!response.ok) {
      throw new Error(`Lever returned ${response.status}`);
    }

    const postings = (await response.json()) as LeverPosting[];
    return postings.map((posting) =>
      withOptionalPublishedAt(
        {
          companyName: watch.companyName,
          title: posting.text,
          description: textFromHtml([posting.descriptionPlain, posting.description, posting.additionalPlain].filter(Boolean).join("\n")),
          sourceUrl: posting.hostedUrl,
          applyUrl: posting.applyUrl ?? posting.hostedUrl,
          locations: posting.categories?.location === undefined ? [] : [posting.categories.location]
        },
        posting.createdAt === undefined ? undefined : new Date(posting.createdAt)
      )
    );
  }
}

class AshbyAdapter implements CareerPlatformAdapter {
  readonly name = "ashby";

  constructor(private readonly fetcher: FetchLike) {}

  supports(watch: CompanyWatch): boolean {
    return extractAshbyOrganizationToken(watch.careersUrl) !== undefined;
  }

  async fetchJobs(watch: CompanyWatch): Promise<RawJobPostingInput[]> {
    const organizationToken = extractAshbyOrganizationToken(watch.careersUrl);
    if (organizationToken === undefined) return [];

    const response = await this.fetcher(`https://api.ashbyhq.com/posting-api/job-board/${organizationToken}`);
    if (!response.ok) {
      throw new Error(`Ashby returned ${response.status}`);
    }

    const payload = (await response.json()) as AshbyJobBoardResponse;
    return (payload.jobs ?? []).map((job) => ({
      companyName: watch.companyName,
      title: job.title,
      description: textFromHtml(job.descriptionHtml ?? `${job.title} listed on ${watch.companyName}.`),
      sourceUrl: job.jobUrl,
      applyUrl: job.applyUrl ?? job.jobUrl,
      locations: job.locationName === undefined ? [] : [job.locationName]
    }));
  }
}

class WorkdayAdapter implements CareerPlatformAdapter {
  readonly name = "workday";

  constructor(
    private readonly fetcher: FetchLike,
    private readonly genericFetcher: GenericCareerPageFetcher
  ) {}

  supports(watch: CompanyWatch): boolean {
    return watch.careersUrl.includes("myworkdayjobs.com");
  }

  async fetchJobs(watch: CompanyWatch): Promise<RawJobPostingInput[]> {
    const endpoint = buildWorkdayJobsEndpoint(watch.careersUrl);
    if (endpoint === undefined) {
      return this.genericFetcher.fetchJobs(watch);
    }

    const postings: WorkdayJobPosting[] = [];
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;

    for (let page = 0; page < maximumWorkdayPages && offset < total; page += 1) {
      const response = await this.fetcher(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "RoleRadarBot/0.1"
        },
        body: JSON.stringify({
          appliedFacets: {},
          limit: workdayPageSize,
          offset,
          searchText: ""
        })
      });

      if (!response.ok) {
        throw new Error(`Workday returned ${response.status} for ${endpoint}: ${await response.text()}`);
      }

      const payload = (await response.json()) as WorkdayJobsResponse;
      const pagePostings = payload.jobPostings ?? [];
      postings.push(...pagePostings);
      total = payload.total ?? payload.totalHits ?? pagePostings.length + offset;
      offset += pagePostings.length;

      if (pagePostings.length < workdayPageSize) {
        break;
      }
    }

    const jobs = await mapWithConcurrency(postings, workdayDetailConcurrency, (posting) =>
      this.fetchDetailedJob(watch, posting)
    );
    return deduplicateJobsBySourceUrl(jobs);
  }

  private async fetchDetailedJob(watch: CompanyWatch, posting: WorkdayJobPosting): Promise<RawJobPostingInput> {
    const fallback = toWorkdayJob(watch, posting);
    const endpoint = buildWorkdayDetailEndpoint(watch.careersUrl, posting.externalPath);
    if (endpoint === undefined) return fallback;

    try {
      const response = await this.fetcher(endpoint, {
        headers: { "user-agent": "RoleRadarBot/0.1" }
      });
      if (!response.ok) return fallback;

      const payload = (await response.json()) as WorkdayJobDetailResponse;
      const detail = payload.jobPostingInfo;
      if (detail === undefined) return fallback;

      const sourceUrl = toAbsoluteUrl(posting.externalPath, watch.careersUrl) ?? fallback.sourceUrl;
      const locations = uniqueStrings([
        detail.location,
        ...(detail.additionalLocations ?? []),
        ...(fallback.locations ?? [])
      ]);
      return withOptionalPublishedAt(
        {
          companyName: watch.companyName,
          title: detail.title?.trim() || posting.title,
          description: textFromHtml(detail.jobDescription ?? fallback.description),
          sourceUrl,
          applyUrl: detail.externalUrl === undefined ? sourceUrl : (toAbsoluteUrl(detail.externalUrl, watch.careersUrl) ?? sourceUrl),
          locations
        },
        parseWorkdayPostedAt(detail.postedOn ?? posting.postedOn)
      );
    } catch {
      return fallback;
    }
  }
}

function toWorkdayJob(watch: CompanyWatch, job: WorkdayJobPosting): RawJobPostingInput {
      const sourceUrl = toAbsoluteUrl(job.externalPath, watch.careersUrl) ?? watch.careersUrl;
      const requisitionId = job.bulletFields?.[0];
      const descriptionParts = [
        `${job.title} listed on ${watch.companyName} Workday careers portal.`,
        requisitionId === undefined ? undefined : `Requisition ID: ${requisitionId}.`,
        job.postedOn === undefined ? undefined : `Posted ${job.postedOn}.`,
        job.bulletFields?.slice(1).join(". ")
      ].filter((part): part is string => part !== undefined);
      return withOptionalPublishedAt({
        companyName: watch.companyName,
        title: job.title,
        description: descriptionParts.join(" "),
        sourceUrl,
        applyUrl: sourceUrl,
        locations: parseWorkdayLocations(job.locationsText)
      }, parseWorkdayPostedAt(job.postedOn));
}

class KnownCareerPageAdapter implements CareerPlatformAdapter {
  readonly name = "known-career-page";
  private readonly workdayAdapter: WorkdayAdapter;

  constructor(
    fetcher: FetchLike,
    genericFetcher: GenericCareerPageFetcher
  ) {
    this.workdayAdapter = new WorkdayAdapter(fetcher, genericFetcher);
  }

  supports(watch: CompanyWatch): boolean {
    return knownCareerPageUrl(watch) !== undefined;
  }

  async fetchJobs(watch: CompanyWatch): Promise<RawJobPostingInput[]> {
    const careersUrl = knownCareerPageUrl(watch);
    if (careersUrl === undefined) return [];
    return this.workdayAdapter.fetchJobs({ ...watch, careersUrl });
  }
}

export function extractJobLinks(watch: CompanyWatch, html: string): RawJobPostingInput[] {
  const candidates = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const seenUrls = new Set<string>();
  const jobs: RawJobPostingInput[] = [];

  for (const candidate of candidates) {
    const href = candidate[1];
    const title = stripTags(candidate[2] ?? "").trim();

    if (href === undefined || title.length < 4 || !looksLikeJobLink(title, href)) {
      continue;
    }

    const sourceUrl = toAbsoluteUrl(href, watch.careersUrl);
    if (sourceUrl === undefined || seenUrls.has(sourceUrl)) {
      continue;
    }

    seenUrls.add(sourceUrl);
    jobs.push({
      companyName: watch.companyName,
      title,
      description: `${title} listed on ${watch.companyName} careers page.`,
      sourceUrl,
      applyUrl: sourceUrl
    });
  }

  return jobs;
}

function looksLikeJobLink(title: string, href: string): boolean {
  const text = `${title} ${href}`.toLowerCase();
  if (!hasJobDetailUrl(href)) {
    return false;
  }

  return /\b(engineer|developer|software|backend|frontend|rtl|verification|embedded|mechanical|civil|structural|manufacturing|design|quality|intern|graduate|job|opening|role)\b/.test(text);
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

function textFromHtml(html: string): string {
  const text = stripTags(html).trim();
  return text.length === 0 ? "No description provided." : text;
}

function withOptionalPublishedAt(job: RawJobPostingInput, publishedAt: Date | undefined): RawJobPostingInput {
  if (publishedAt === undefined || Number.isNaN(publishedAt.getTime())) {
    return job;
  }

  return {
    ...job,
    publishedAt
  };
}

function deduplicateJobsBySourceUrl(jobs: RawJobPostingInput[]): RawJobPostingInput[] {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    if (seen.has(job.sourceUrl)) return false;
    seen.add(job.sourceUrl);
    return true;
  });
}

function parseWorkdayPostedAt(value: string | undefined): Date | undefined {
  if (value === undefined) return undefined;
  const normalized = value.replace(/^posted\s+/i, "").trim();
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toAbsoluteUrl(href: string, baseUrl: string): string | undefined {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function extractGreenhouseBoardToken(careersUrl: string): string | undefined {
  const url = parseUrl(careersUrl);
  if (url === undefined) return undefined;

  if (url.hostname === "boards.greenhouse.io" || url.hostname === "job-boards.greenhouse.io") {
    return firstPathSegment(url);
  }

  return undefined;
}

function extractLeverCompanyToken(careersUrl: string): string | undefined {
  const url = parseUrl(careersUrl);
  if (url === undefined || url.hostname !== "jobs.lever.co") return undefined;
  return firstPathSegment(url);
}

function extractAshbyOrganizationToken(careersUrl: string): string | undefined {
  const url = parseUrl(careersUrl);
  if (url === undefined || url.hostname !== "jobs.ashbyhq.com") return undefined;
  return firstPathSegment(url);
}

function buildWorkdayJobsEndpoint(careersUrl: string): string | undefined {
  const url = parseUrl(careersUrl);
  if (url === undefined || !url.hostname.includes("myworkdayjobs.com")) return undefined;

  const tenant = url.hostname.split(".")[0];
  const site = url.pathname
    .split("/")
    .filter((segment) => segment.length > 0)
    .filter((segment) => !/^[a-z]{2}-[A-Z]{2}$/.test(segment))[0];

  if (tenant === undefined || site === undefined) {
    return undefined;
  }

  return `${url.origin}/wday/cxs/${tenant}/${site}/jobs`;
}

function buildWorkdayDetailEndpoint(careersUrl: string, externalPath: string): string | undefined {
  const jobsEndpoint = buildWorkdayJobsEndpoint(careersUrl);
  if (jobsEndpoint === undefined) return undefined;
  const baseEndpoint = jobsEndpoint.replace(/\/jobs$/, "");
  const pathSegments = externalPath.split("/").filter(Boolean);
  const jobSegmentIndex = pathSegments.findIndex((segment) => segment.toLowerCase() === "job");
  if (jobSegmentIndex === -1) return undefined;
  const detailPath = `/${pathSegments.slice(jobSegmentIndex).join("/")}`;
  return `${baseEndpoint}${detailPath}`;
}

function knownCareerPageUrl(watch: CompanyWatch): string | undefined {
  const url = parseUrl(watch.careersUrl);
  if (url === undefined) return undefined;

  const companyName = watch.companyName.toLowerCase();
  if (companyName.includes("nvidia") && (url.hostname.includes("nvidia.com") || url.hostname === "jobs.nvidia.com")) {
    return "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite";
  }

  return undefined;
}

function hasJobDetailUrl(href: string): boolean {
  const normalizedHref = href.toLowerCase();
  return (
    /\/job(s)?\/[^/?#]+/.test(normalizedHref) ||
    /\/careers-home\/jobs\/\d+/.test(normalizedHref) ||
    /jobseqno=/.test(normalizedHref)
  );
}

function parseWorkdayLocations(locationsText: string | undefined): string[] {
  if (locationsText === undefined || /^\d+\s+locations?$/i.test(locationsText.trim())) {
    return [];
  }

  return locationsText
    .split(/\s*;\s*|\s*\|\s*/)
    .map((location) => location.trim())
    .filter((location) => location.length > 0);
}

function withTimeout(fetcher: FetchLike, timeoutMs: number): FetchLike {
  return async (input, init = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetcher(input, {
        ...init,
        signal: init.signal ?? controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}

function withRetry(fetcher: FetchLike, maximumAttempts: number, initialDelayMs: number): FetchLike {
  return async (input, init = {}) => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      try {
        const response = await fetcher(input, init);
        if (!isRetriableStatus(response.status) || attempt === maximumAttempts) {
          return response;
        }
      } catch (error) {
        lastError = error;
        if (attempt === maximumAttempts) throw error;
      }

      await delay(initialDelayMs * 2 ** (attempt - 1));
    }

    throw lastError instanceof Error ? lastError : new Error("Job source request failed");
  };
}

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function mapWithConcurrency<TInput, TOutput>(
  values: TInput[],
  concurrency: number,
  mapper: (value: TInput) => Promise<TOutput>
): Promise<TOutput[]> {
  const results: TOutput[] = new Array(values.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      const value = values[index];
      if (value !== undefined) results[index] = await mapper(value);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
  return results;
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function firstPathSegment(url: URL): string | undefined {
  return url.pathname.split("/").filter((segment) => segment.length > 0)[0];
}

interface GreenhouseJobsResponse {
  jobs?: Array<{
    title: string;
    absolute_url: string;
    content?: string;
    updated_at?: string;
    location?: {
      name?: string;
    };
  }>;
}

interface LeverPosting {
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number;
  description?: string;
  descriptionPlain?: string;
  additionalPlain?: string;
  categories?: {
    location?: string;
  };
}

interface AshbyJobBoardResponse {
  jobs?: Array<{
    title: string;
    jobUrl: string;
    applyUrl?: string;
    descriptionHtml?: string;
    locationName?: string;
  }>;
}

interface WorkdayJobsResponse {
  jobPostings?: WorkdayJobPosting[];
  total?: number;
  totalHits?: number;
}

interface WorkdayJobPosting {
  title: string;
  externalPath: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
}

interface WorkdayJobDetailResponse {
  jobPostingInfo?: {
    title?: string;
    jobDescription?: string;
    location?: string;
    additionalLocations?: string[];
    externalUrl?: string;
    postedOn?: string;
  };
}
