import type { CompanyWatch } from "../company-watches/company-watch.types.js";
import type { RawJobPostingInput } from "../ingestion/ingestion.dto.js";

export interface CareerPageFetcher {
  fetchJobs(watch: CompanyWatch): Promise<RawJobPostingInput[]>;
}

type FetchLike = typeof fetch;
const defaultFetchTimeoutMs = 12_000;
const defaultFetchAttempts = 3;
const initialRetryDelayMs = 200;
const maximumJsonResponseBytes = 8 * 1024 * 1024;
const largeJsonResponseBytes = 32 * 1024 * 1024;
const workdayPageSize = 20;
// Listings are cheap (titles only). Page deep, then fetch full descriptions
// only for postings whose title looks relevant, which bounds memory.
const maximumWorkdayPages = 60;
const maximumWorkdayDetails = 600;
const workdayDetailConcurrency = 5;
const detailConcurrency = 5;
const maximumGreenhouseDetails = 1000;
const smartRecruitersPageSize = 100;
const maximumSmartRecruitersPostings = 1000;

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
      new WorkableAdapter(resilientFetcher),
      new SmartRecruitersAdapter(resilientFetcher),
      new EightfoldAdapter(resilientFetcher),
      new OracleHcmAdapter(resilientFetcher),
      new WorkdayAdapter(resilientFetcher, genericFetcher),
      new KnownCareerPageAdapter(resilientFetcher, genericFetcher),
      genericFetcher
    ];

    // Many company portals are only a shell around a hosted ATS. When the page
    // embeds one, use that ATS's structured API instead of scraping markup.
    genericFetcher.resolveEmbeddedPlatform = async (watch, html) => {
      const careersUrl = detectEmbeddedPlatformUrl(html, watch.careersUrl);
      if (careersUrl === undefined || careersUrl === watch.careersUrl) return undefined;
      const embeddedWatch = { ...watch, careersUrl };
      const adapter = this.adapters.find((candidate) => candidate !== genericFetcher && candidate.supports(embeddedWatch));
      return adapter?.fetchJobs(embeddedWatch);
    };
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
  resolveEmbeddedPlatform?: (watch: CompanyWatch, html: string) => Promise<RawJobPostingInput[] | undefined>;

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

    const html = await response.text();

    const embedded = await this.resolveEmbeddedPlatform?.(watch, html);
    if (embedded !== undefined && embedded.length > 0) return embedded;

    // Best case: the page publishes schema.org JobPosting data.
    const structured = extractJsonLdJobs(html, watch);
    if (structured.length > 0) return deduplicateJobsBySourceUrl(structured);

    const links = extractJobLinks(watch, html).slice(0, maximumHtmlDetailPages);
    const jobs = await mapWithConcurrency(links, detailConcurrency, (link) => this.enrichFromDetailPage(watch, link));
    return deduplicateJobsBySourceUrl(jobs);
  }

  // Listing pages only carry a title. Each job's own page carries the location,
  // description and experience requirements the eligibility rules need.
  private async enrichFromDetailPage(watch: CompanyWatch, link: RawJobPostingInput): Promise<RawJobPostingInput> {
    try {
      const response = await this.fetcher(link.sourceUrl, { headers: { "user-agent": "RoleRadarBot/0.1" } });
      if (!response.ok) return link;
      const html = (await response.text()).slice(0, maximumDetailPageChars);

      const structured = extractJsonLdJobs(html, { ...watch, careersUrl: link.sourceUrl })[0];
      if (structured !== undefined) return { ...structured, sourceUrl: link.sourceUrl, applyUrl: link.applyUrl ?? link.sourceUrl };

      const description = pageTextSummary(html);
      return description.length > link.description.length ? { ...link, description: `${link.title}. ${description}` } : link;
    } catch {
      return link;
    }
  }
}

const maximumHtmlDetailPages = 80;
const maximumDetailPageChars = 400_000;

function pageTextSummary(html: string): string {
  const meta = html.match(/<meta[^>]+(?:name|property)=["'](?:og:)?description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? "";
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(nav|header|footer)[\s\S]*?<\/\1>/gi, " ");
  return `${decodeEntities(meta)} ${stripTags(body)}`.replace(/\s+/g, " ").trim().slice(0, 6000);
}

export function extractJsonLdJobs(html: string, watch: Pick<CompanyWatch, "companyName" | "careersUrl">): RawJobPostingInput[] {
  const jobs: RawJobPostingInput[] = [];

  for (const block of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse((block[1] ?? "").trim());
    } catch {
      continue;
    }

    for (const node of flattenJsonLd(parsed)) {
      const types = ([] as unknown[]).concat(node["@type"] ?? []);
      if (!types.includes("JobPosting")) continue;

      const title = typeof node.title === "string" ? node.title.trim() : "";
      if (title.length === 0) continue;

      const sourceUrl = toAbsoluteUrl(typeof node.url === "string" ? node.url : "", watch.careersUrl) ?? watch.careersUrl;
      const locations = jsonLdLocations(node.jobLocation);
      const isRemote = node.jobLocationType === "TELECOMMUTE";
      const employmentType = jsonLdEmploymentType(node.employmentType);
      const datePosted = typeof node.datePosted === "string" ? new Date(node.datePosted) : undefined;
      const hiringOrganization = node.hiringOrganization as { name?: unknown } | undefined;

      jobs.push(
        withOptionalPublishedAt(
          {
            companyName: watch.companyName,
            title,
            description: textFromHtml(decodeEntities(typeof node.description === "string" ? node.description : `${title} listed on ${watch.companyName}.`)),
            sourceUrl,
            applyUrl: sourceUrl,
            locations: isRemote && locations.length === 0 ? ["Remote"] : locations,
            ...(isRemote ? { workMode: "REMOTE" as const } : {}),
            ...(employmentType === undefined ? {} : { employmentType })
          },
          datePosted
        )
      );
      void hiringOrganization;
    }
  }

  return jobs;
}

function flattenJsonLd(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (typeof value !== "object" || value === null) return [];
  const node = value as Record<string, unknown>;
  const nested = [node["@graph"], node.itemListElement, node.item].flatMap((child) => (child === undefined ? [] : flattenJsonLd(child)));
  return [node, ...nested];
}

function jsonLdLocations(value: unknown): string[] {
  const places = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return uniqueStrings(
    places.map((place) => {
      const address = (place as { address?: unknown } | null)?.address;
      if (typeof address === "string") return address;
      if (typeof address !== "object" || address === null) return undefined;
      const record = address as Record<string, unknown>;
      const country = record.addressCountry;
      const countryName = typeof country === "string" ? country : (country as { name?: string } | undefined)?.name;
      const parts = [record.addressLocality, record.addressRegion, countryName].filter(
        (part): part is string => typeof part === "string" && part.trim().length > 0
      );
      return parts.length === 0 ? undefined : parts.join(", ");
    })
  );
}

function jsonLdEmploymentType(value: unknown): RawJobPostingInput["employmentType"] {
  const text = ([] as unknown[]).concat(value ?? []).join(" ").toUpperCase();
  if (text.includes("INTERN")) return "INTERNSHIP";
  if (text.includes("PART")) return "PART_TIME";
  if (text.includes("CONTRACT") || text.includes("TEMPORARY")) return "CONTRACT";
  if (text.includes("FULL")) return "FULL_TIME";
  return undefined;
}

export function detectEmbeddedPlatformUrl(html: string, pageUrl: string): string | undefined {
  const greenhouse = html.match(/https?:\/\/(?:boards|job-boards)\.greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=)?([a-z0-9_-]+)/i)?.[1];
  if (greenhouse !== undefined && !["embed", "v1"].includes(greenhouse.toLowerCase())) return `https://boards.greenhouse.io/${greenhouse}`;

  const lever = html.match(/https?:\/\/jobs\.lever\.co\/([a-z0-9_-]+)/i)?.[1];
  if (lever !== undefined) return `https://jobs.lever.co/${lever}`;

  const ashby = html.match(/https?:\/\/jobs\.ashbyhq\.com\/([a-z0-9_.-]+)/i)?.[1];
  if (ashby !== undefined) return `https://jobs.ashbyhq.com/${ashby}`;

  const workable = html.match(/https?:\/\/apply\.workable\.com\/([a-z0-9_-]+)/i)?.[1];
  if (workable !== undefined && workable.toLowerCase() !== "j") return `https://apply.workable.com/${workable}`;

  const smartRecruiters = html.match(/https?:\/\/(?:jobs|careers)\.smartrecruiters\.com\/([A-Za-z0-9_-]+)/)?.[1];
  if (smartRecruiters !== undefined) return `https://jobs.smartrecruiters.com/${smartRecruiters}`;

  const workday = html.match(/https?:\/\/[a-z0-9-]+\.wd\d+\.myworkdayjobs\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?[A-Za-z0-9_-]+/)?.[0];
  if (workday !== undefined) return workday;

  const oracle = html.match(/https?:\/\/([a-z0-9-]+\.fa\.[a-z0-9-]+\.oraclecloud\.com)[^"'\s]*?\/sites\/([A-Za-z0-9_]+)/);
  if (oracle?.[1] !== undefined && oracle[2] !== undefined) {
    return `https://${oracle[1]}/hcmUI/CandidateExperience/en/sites/${oracle[2]}/jobs`;
  }

  if (/pcsx|eightfold/i.test(html)) {
    const domain = html.match(/["']?domain["']?\s*[:=]\s*["']([a-z0-9.-]+\.[a-z]{2,})["']/i)?.[1];
    const origin = parseUrl(pageUrl)?.origin;
    if (domain !== undefined && origin !== undefined) return `${origin}/careers?domain=${domain}`;
  }

  return undefined;
}

class EightfoldAdapter implements CareerPlatformAdapter {
  readonly name = "eightfold";

  constructor(private readonly fetcher: FetchLike) {}

  supports(watch: CompanyWatch): boolean {
    const url = parseUrl(watch.careersUrl);
    return url !== undefined && url.pathname.startsWith("/careers") && url.searchParams.has("domain");
  }

  async fetchJobs(watch: CompanyWatch): Promise<RawJobPostingInput[]> {
    const url = parseUrl(watch.careersUrl);
    const domain = url?.searchParams.get("domain");
    if (url === undefined || domain === null || domain === undefined) return [];
    const location = url.searchParams.get("location") ?? "";
    const query = `domain=${encodeURIComponent(domain)}`;

    const positions: EightfoldPosition[] = [];
    let total = Number.POSITIVE_INFINITY;
    for (let page = 0; page < maximumEightfoldPages && positions.length < total; page += 1) {
      const response = await this.fetcher(
        `${url.origin}/api/pcsx/search?${query}&query=&location=${encodeURIComponent(location)}&start=${page * eightfoldPageSize}`,
        { headers: { "user-agent": "Mozilla/5.0 RoleRadarBot/0.1" } }
      );
      if (!response.ok) throw new Error(`Eightfold returned ${response.status}`);

      const payload = await readBoundedJsonResponse<{ data?: { positions?: EightfoldPosition[]; count?: number } }>(response, "Eightfold");
      const pagePositions = payload.data?.positions ?? [];
      if (page === 0) total = payload.data?.count ?? pagePositions.length;
      if (pagePositions.length === 0) break;
      positions.push(...pagePositions);
      await delay(200);
    }

    const relevant = positions.filter((position) => isRelevantJobTitle(position.name)).slice(0, maximumWorkdayDetails);
    return mapWithConcurrency(relevant, detailConcurrency, async (position) => {
      const sourceUrl = `${url.origin}${position.positionUrl ?? `/careers/job/${position.id}`}`;
      let description = `${position.name} listed on ${watch.companyName}.`;
      let locations = position.locations ?? [];
      try {
        const detail = await this.fetcher(
          `${url.origin}/api/pcsx/position_details?position_id=${position.id}&${query}&hl=en`,
          { headers: { "user-agent": "Mozilla/5.0 RoleRadarBot/0.1" } }
        );
        if (detail.ok) {
          const payload = await readBoundedJsonResponse<{ data?: { jobDescription?: string; locations?: string[] } }>(detail, "Eightfold detail");
          description = textFromHtml(decodeEntities(payload.data?.jobDescription ?? description));
          locations = payload.data?.locations ?? locations;
        }
      } catch {
        // Keep the title-only description.
      }

      const mode = position.workLocationOption?.toLowerCase();
      return withOptionalPublishedAt(
        {
          companyName: watch.companyName,
          title: position.name,
          description,
          sourceUrl,
          applyUrl: sourceUrl,
          locations: uniqueStrings(locations),
          ...(mode === "remote" ? { workMode: "REMOTE" as const } : mode === "hybrid" ? { workMode: "HYBRID" as const } : mode === "onsite" ? { workMode: "ONSITE" as const } : {})
        },
        position.postedTs === undefined ? undefined : new Date(position.postedTs * 1000)
      );
    });
  }
}

class OracleHcmAdapter implements CareerPlatformAdapter {
  readonly name = "oracle-hcm";

  constructor(private readonly fetcher: FetchLike) {}

  supports(watch: CompanyWatch): boolean {
    return parseOracleSite(watch.careersUrl) !== undefined;
  }

  async fetchJobs(watch: CompanyWatch): Promise<RawJobPostingInput[]> {
    const site = parseOracleSite(watch.careersUrl);
    if (site === undefined) return [];

    const requisitions: OracleRequisition[] = [];
    let total = Number.POSITIVE_INFINITY;
    for (let page = 0; page < maximumOraclePages && requisitions.length < total; page += 1) {
      const response = await this.fetcher(
        `${site.origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=${site.siteNumber},limit=${oraclePageSize},offset=${page * oraclePageSize},sortBy=POSTING_DATES_DESC`,
        { headers: { "user-agent": "Mozilla/5.0 RoleRadarBot/0.1" } }
      );
      if (!response.ok) throw new Error(`Oracle HCM returned ${response.status}`);

      const payload = await readBoundedJsonResponse<{ items?: Array<{ TotalJobsCount?: number; requisitionList?: OracleRequisition[] }> }>(response, "Oracle HCM");
      const item = payload.items?.[0];
      const pageRequisitions = item?.requisitionList ?? [];
      if (page === 0) total = item?.TotalJobsCount ?? pageRequisitions.length;
      if (pageRequisitions.length === 0) break;
      requisitions.push(...pageRequisitions);
    }

    const relevant = requisitions.filter((requisition) => isRelevantJobTitle(requisition.Title)).slice(0, maximumWorkdayDetails);
    return mapWithConcurrency(relevant, detailConcurrency, async (requisition) => {
      const sourceUrl = `${site.origin}/hcmUI/CandidateExperience/en/sites/${site.siteNumber}/job/${requisition.Id}`;
      let description = `${requisition.Title} listed on ${watch.companyName}.`;
      try {
        const detail = await this.fetcher(
          `${site.origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%22${encodeURIComponent(requisition.Id)}%22,siteNumber=${site.siteNumber}`,
          { headers: { "user-agent": "Mozilla/5.0 RoleRadarBot/0.1" } }
        );
        if (detail.ok) {
          const payload = await readBoundedJsonResponse<{ items?: OracleRequisitionDetail[] }>(detail, "Oracle HCM detail");
          const info = payload.items?.[0];
          description = textFromHtml(
            decodeEntities(
              [info?.ExternalDescriptionStr, info?.ExternalResponsibilitiesStr, info?.ExternalQualificationsStr].filter(Boolean).join("\n") || description
            )
          );
        }
      } catch {
        // Keep the title-only description.
      }

      const workplace = (requisition.WorkplaceTypeCode ?? requisition.WorkplaceType ?? "").toUpperCase();
      const secondary = (requisition.secondaryLocations ?? []).map((location) => location.Name);
      return withOptionalPublishedAt(
        {
          companyName: watch.companyName,
          title: requisition.Title,
          description,
          sourceUrl,
          applyUrl: sourceUrl,
          locations: uniqueStrings([requisition.PrimaryLocation, ...secondary]),
          ...(workplace.includes("REMOTE") ? { workMode: "REMOTE" as const } : workplace.includes("HYBRID") ? { workMode: "HYBRID" as const } : workplace.includes("SITE") ? { workMode: "ONSITE" as const } : {})
        },
        requisition.PostedDate === undefined ? undefined : new Date(requisition.PostedDate)
      );
    });
  }
}

function parseOracleSite(careersUrl: string): { origin: string; siteNumber: string } | undefined {
  const url = parseUrl(careersUrl);
  if (url === undefined || !url.hostname.endsWith(".oraclecloud.com")) return undefined;
  const siteNumber = url.pathname.match(/\/sites\/([A-Za-z0-9_]+)/)?.[1];
  return siteNumber === undefined ? undefined : { origin: url.origin, siteNumber };
}

const eightfoldPageSize = 10;
const maximumEightfoldPages = 60;
const oraclePageSize = 25;
const maximumOraclePages = 40;

interface EightfoldPosition {
  id: number | string;
  name: string;
  locations?: string[];
  postedTs?: number;
  workLocationOption?: string;
  positionUrl?: string;
}

interface OracleRequisition {
  Id: string;
  Title: string;
  PostedDate?: string;
  PrimaryLocation?: string;
  WorkplaceTypeCode?: string;
  WorkplaceType?: string;
  secondaryLocations?: Array<{ Name?: string }>;
}

interface OracleRequisitionDetail {
  ExternalDescriptionStr?: string;
  ExternalResponsibilitiesStr?: string;
  ExternalQualificationsStr?: string;
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

    // The listing excludes descriptions and content=true can be huge, so list
    // first, keep only plausibly relevant titles, then fetch each description
    // (needed to read experience requirements) with small concurrency.
    const response = await this.fetcher(`https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs`);
    if (!response.ok) {
      throw new Error(`Greenhouse returned ${response.status}`);
    }

    const payload = await readBoundedJsonResponse<GreenhouseJobsResponse>(response, "Greenhouse");
    const relevant = (payload.jobs ?? []).filter((job) => isRelevantJobTitle(job.title)).slice(0, maximumGreenhouseDetails);

    return mapWithConcurrency(relevant, detailConcurrency, async (job) => {
      let content = job.content;
      if (content === undefined && job.id !== undefined) {
        try {
          const detail = await this.fetcher(`https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${job.id}`);
          if (detail.ok) {
            content = (await readBoundedJsonResponse<{ content?: string }>(detail, "Greenhouse detail")).content;
          }
        } catch {
          // Fall back to the title-only description below.
        }
      }

      return withOptionalPublishedAt(
        {
          companyName: watch.companyName,
          title: job.title,
          description: textFromHtml(decodeEntities(content ?? `${job.title} listed on ${watch.companyName}.`)),
          sourceUrl: job.absolute_url,
          applyUrl: job.absolute_url,
          locations: job.location?.name === undefined ? [] : [job.location.name]
        },
        job.updated_at === undefined ? undefined : new Date(job.updated_at)
      );
    });
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

    const postings = await readBoundedJsonResponse<LeverPosting[]>(response, "Lever");
    return postings.map((posting) =>
      withOptionalPublishedAt(
        {
          companyName: watch.companyName,
          title: posting.text,
          description: textFromHtml([posting.descriptionPlain, posting.description, posting.additionalPlain].filter(Boolean).join("\n")),
          sourceUrl: posting.hostedUrl,
          applyUrl: posting.applyUrl ?? posting.hostedUrl,
          locations: uniqueStrings([...(posting.categories?.allLocations ?? []), posting.categories?.location]).map(
            (location) => withCountry(location, posting.country)
          ),
          ...leverHints(posting)
        },
        posting.createdAt === undefined ? undefined : new Date(posting.createdAt)
      )
    );
  }
}

function leverHints(posting: LeverPosting): Pick<RawJobPostingInput, "workMode" | "employmentType"> {
  const hints: Pick<RawJobPostingInput, "workMode" | "employmentType"> = {};
  const workplace = posting.workplaceType?.toLowerCase().replace(/[^a-z]/g, "");
  if (workplace === "remote") hints.workMode = "REMOTE";
  else if (workplace === "hybrid") hints.workMode = "HYBRID";
  else if (workplace === "onsite") hints.workMode = "ONSITE";

  const commitment = posting.categories?.commitment?.toLowerCase() ?? "";
  if (/intern/.test(commitment)) hints.employmentType = "INTERNSHIP";
  else if (/part/.test(commitment)) hints.employmentType = "PART_TIME";
  else if (/contract|temp/.test(commitment)) hints.employmentType = "CONTRACT";
  else if (/full/.test(commitment)) hints.employmentType = "FULL_TIME";
  return hints;
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

    // Ashby returns every description in one payload; large boards (800+ jobs) exceed 8 MB.
    const payload = await readBoundedJsonResponse<AshbyJobBoardResponse>(response, "Ashby", largeJsonResponseBytes);
    return (payload.jobs ?? [])
      .filter((job) => job.isListed !== false)
      .map((job) => {
        const country = job.address?.postalAddress?.addressCountry;
        // The address country describes the primary location only.
        const locations = uniqueStrings([
          job.location === undefined ? undefined : withCountry(job.location, country),
          ...(job.secondaryLocations ?? []).map((item) => item.location)
        ]);
        const workMode = ashbyWorkMode(job.workplaceType, job.isRemote);
        const employmentType = ashbyEmploymentType(job.employmentType);
        const description = textFromHtml(job.descriptionHtml ?? job.descriptionPlain ?? `${job.title} listed on ${watch.companyName}.`);
        return withOptionalPublishedAt(
          {
            companyName: watch.companyName,
            title: job.title,
            description,
            sourceUrl: job.jobUrl,
            applyUrl: job.applyUrl ?? job.jobUrl,
            locations: workMode === "REMOTE" && locations.length === 0 ? ["Remote"] : locations,
            ...(workMode === undefined ? {} : { workMode }),
            ...(employmentType === undefined ? {} : { employmentType })
          },
          job.publishedAt === undefined ? undefined : new Date(job.publishedAt)
        );
      });
  }
}

function withCountry(location: string, country: string | undefined): string {
  if (country === undefined || country.trim().length === 0) return location;
  return location.toLowerCase().includes(country.toLowerCase()) ? location : `${location}, ${country}`;
}

function ashbyWorkMode(workplaceType: string | null | undefined, isRemote: boolean | null | undefined): RawJobPostingInput["workMode"] {
  const normalized = workplaceType?.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized === "remote" || isRemote === true) return "REMOTE";
  if (normalized === "hybrid") return "HYBRID";
  if (normalized === "onsite") return "ONSITE";
  return undefined;
}

function ashbyEmploymentType(value: string | null | undefined): RawJobPostingInput["employmentType"] {
  switch (value?.toLowerCase()) {
    case "fulltime":
      return "FULL_TIME";
    case "parttime":
      return "PART_TIME";
    case "intern":
      return "INTERNSHIP";
    case "contract":
    case "temporary":
      return "CONTRACT";
    default:
      return undefined;
  }
}

class WorkableAdapter implements CareerPlatformAdapter {
  readonly name = "workable";

  constructor(private readonly fetcher: FetchLike) {}

  supports(watch: CompanyWatch): boolean {
    return extractWorkableAccount(watch.careersUrl) !== undefined;
  }

  async fetchJobs(watch: CompanyWatch): Promise<RawJobPostingInput[]> {
    const account = extractWorkableAccount(watch.careersUrl);
    if (account === undefined) return [];

    const response = await this.fetcher(`https://apply.workable.com/api/v1/widget/accounts/${account}?details=true`);
    if (!response.ok) {
      throw new Error(`Workable returned ${response.status}`);
    }

    const payload = await readBoundedJsonResponse<WorkableResponse>(response, "Workable");
    return (payload.jobs ?? [])
      .filter((job) => isRelevantJobTitle(job.title))
      .map((job) => {
        const locations = uniqueStrings(
          (job.locations ?? []).map((location) => [location.city, location.region, location.country].filter(Boolean).join(", "))
        );
        const employmentType = workableEmploymentType(job.employment_type);
        return withOptionalPublishedAt(
          {
            companyName: watch.companyName,
            title: job.title,
            description: textFromHtml(decodeEntities(job.description ?? `${job.title} listed on ${watch.companyName}.`)),
            sourceUrl: job.shortlink ?? job.url,
            applyUrl: job.application_url ?? job.shortlink ?? job.url,
            locations: job.telecommuting === true && locations.length === 0 ? ["Remote"] : locations,
            ...(job.telecommuting === true ? { workMode: "REMOTE" as const } : {}),
            ...(employmentType === undefined ? {} : { employmentType })
          },
          job.published_on === undefined ? undefined : new Date(job.published_on)
        );
      });
  }
}

function workableEmploymentType(value: string | undefined): RawJobPostingInput["employmentType"] {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("intern")) return "INTERNSHIP";
  if (normalized.includes("part")) return "PART_TIME";
  if (normalized.includes("contract") || normalized.includes("temp")) return "CONTRACT";
  if (normalized.includes("full")) return "FULL_TIME";
  return undefined;
}

class SmartRecruitersAdapter implements CareerPlatformAdapter {
  readonly name = "smartrecruiters";

  constructor(private readonly fetcher: FetchLike) {}

  supports(watch: CompanyWatch): boolean {
    return extractSmartRecruitersCompany(watch.careersUrl) !== undefined;
  }

  async fetchJobs(watch: CompanyWatch): Promise<RawJobPostingInput[]> {
    const company = extractSmartRecruitersCompany(watch.careersUrl);
    if (company === undefined) return [];

    const postings: SmartRecruitersPosting[] = [];
    for (let offset = 0; offset < maximumSmartRecruitersPostings; offset += smartRecruitersPageSize) {
      const response = await this.fetcher(
        `https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=${smartRecruitersPageSize}&offset=${offset}`
      );
      if (!response.ok) throw new Error(`SmartRecruiters returned ${response.status}`);

      const page = await readBoundedJsonResponse<SmartRecruitersListResponse>(response, "SmartRecruiters");
      postings.push(...(page.content ?? []));
      if ((page.content ?? []).length < smartRecruitersPageSize || offset + smartRecruitersPageSize >= (page.totalFound ?? 0)) {
        break;
      }
    }

    const relevant = postings.filter((posting) => isRelevantJobTitle(posting.name)).slice(0, maximumWorkdayDetails);
    return mapWithConcurrency(relevant, detailConcurrency, async (posting) => {
      let description = `${posting.name} listed on ${watch.companyName}.`;
      let postingUrl: string | undefined;
      try {
        const detail = await this.fetcher(`https://api.smartrecruiters.com/v1/companies/${company}/postings/${posting.id}`);
        if (detail.ok) {
          const payload = await readBoundedJsonResponse<SmartRecruitersDetail>(detail, "SmartRecruiters detail");
          const sections = payload.jobAd?.sections;
          description = textFromHtml(
            [sections?.jobDescription?.text, sections?.qualifications?.text, sections?.additionalInformation?.text]
              .filter(Boolean)
              .join("\n")
          );
          postingUrl = payload.postingUrl;
        }
      } catch {
        // Keep the title-only description.
      }

      const location = posting.location;
      const fullLocation = location?.fullLocation ?? [location?.city, location?.region, location?.country?.toUpperCase()].filter(Boolean).join(", ");
      const sourceUrl = postingUrl ?? `https://jobs.smartrecruiters.com/${company}/${posting.id}`;
      return withOptionalPublishedAt(
        {
          companyName: watch.companyName,
          title: posting.name,
          description,
          sourceUrl,
          applyUrl: sourceUrl,
          locations: location?.remote === true && fullLocation.length === 0 ? ["Remote"] : fullLocation.length === 0 ? [] : [fullLocation],
          ...(location?.remote === true ? { workMode: "REMOTE" as const } : location?.hybrid === true ? { workMode: "HYBRID" as const } : {})
        },
        posting.releasedDate === undefined ? undefined : new Date(posting.releasedDate)
      );
    });
  }
}

function extractWorkableAccount(careersUrl: string): string | undefined {
  const url = parseUrl(careersUrl);
  if (url === undefined || url.hostname !== "apply.workable.com") return undefined;
  const segment = firstPathSegment(url);
  return segment === "j" ? undefined : segment;
}

function extractSmartRecruitersCompany(careersUrl: string): string | undefined {
  const url = parseUrl(careersUrl);
  if (url === undefined) return undefined;
  if (url.hostname === "jobs.smartrecruiters.com" || url.hostname === "careers.smartrecruiters.com") {
    return firstPathSegment(url);
  }
  return undefined;
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

      const payload = await readBoundedJsonResponse<WorkdayJobsResponse>(response, "Workday listing");
      const pagePostings = payload.jobPostings ?? [];
      postings.push(...pagePostings);
      // Workday only reports the real total on the first page; later pages
      // return 0, which would otherwise end paging after two requests.
      if (page === 0) total = payload.total ?? payload.totalHits ?? pagePostings.length;
      offset += pagePostings.length;

      if (pagePostings.length < workdayPageSize) {
        break;
      }
    }

    const relevantPostings = postings.filter((posting) => isRelevantJobTitle(posting.title)).slice(0, maximumWorkdayDetails);
    const jobs = await mapWithConcurrency(relevantPostings, workdayDetailConcurrency, (posting) =>
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

      const payload = await readBoundedJsonResponse<WorkdayJobDetailResponse>(response, "Workday detail");
      const detail = payload.jobPostingInfo;
      if (detail === undefined) return fallback;

      const sourceUrl = toAbsoluteUrl(posting.externalPath, watch.careersUrl) ?? fallback.sourceUrl;
      const locations = uniqueStrings([
        detail.location,
        ...(detail.additionalLocations ?? []),
        ...(fallback.locations ?? [])
      ]).map((location) => withCountry(location, detail.country?.descriptor));
      const remoteType = detail.remoteType?.toLowerCase().replace(/[^a-z]/g, "");
      const workMode: RawJobPostingInput["workMode"] | undefined =
        remoteType === "remote" ? "REMOTE" : remoteType === "hybrid" ? "HYBRID" : remoteType === "onsite" ? "ONSITE" : undefined;
      return withOptionalPublishedAt(
        {
          companyName: watch.companyName,
          title: detail.title?.trim() || posting.title,
          description: textFromHtml(detail.jobDescription ?? fallback.description),
          sourceUrl,
          applyUrl: detail.externalUrl === undefined ? sourceUrl : (toAbsoluteUrl(detail.externalUrl, watch.careersUrl) ?? sourceUrl),
          locations,
          ...(workMode === undefined ? {} : { workMode })
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

// Titles that clearly are not hiring postings for a role (events, talent pools).
const irrelevantTitlePattern = /\b(talent (?:community|network|pool)|general application|future opportunities|join our talent)\b/i;

export function isRelevantJobTitle(title: string): boolean {
  return !irrelevantTitlePattern.test(title);
}

function decodeEntities(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
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

export async function readBoundedJsonResponse<T>(
  response: Response,
  sourceName: string,
  maximumBytes = maximumJsonResponseBytes
): Promise<T> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    await response.body?.cancel();
    throw responseTooLargeError(sourceName, maximumBytes);
  }

  if (response.body === null) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maximumBytes) {
      throw responseTooLargeError(sourceName, maximumBytes);
    }
    return JSON.parse(text) as T;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw responseTooLargeError(sourceName, maximumBytes);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function responseTooLargeError(sourceName: string, maximumBytes: number): Error {
  const maximumMegabytes = Math.floor(maximumBytes / (1024 * 1024));
  return new Error(`${sourceName} response exceeds the ${maximumMegabytes} MB safety limit`);
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
        // Rate limiting needs a real pause, not the short network-error backoff.
        if (response.status === 429) {
          const retryAfterSeconds = Number(response.headers.get("retry-after"));
          await delay(Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? Math.min(retryAfterSeconds, 20) * 1000 : 2000 * attempt);
          continue;
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
    id?: number;
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
  country?: string;
  workplaceType?: string;
  categories?: {
    location?: string;
    allLocations?: string[];
    commitment?: string;
  };
}

interface AshbyJobBoardResponse {
  jobs?: Array<{
    title: string;
    jobUrl: string;
    applyUrl?: string;
    descriptionHtml?: string;
    descriptionPlain?: string;
    location?: string;
    secondaryLocations?: Array<{ location?: string }>;
    address?: { postalAddress?: { addressCountry?: string } };
    isListed?: boolean;
    isRemote?: boolean | null;
    workplaceType?: string | null;
    employmentType?: string | null;
    publishedAt?: string;
  }>;
}

interface WorkableResponse {
  jobs?: Array<{
    title: string;
    shortlink?: string;
    url: string;
    application_url?: string;
    description?: string;
    employment_type?: string;
    telecommuting?: boolean;
    published_on?: string;
    locations?: Array<{ city?: string; region?: string; country?: string }>;
  }>;
}

interface SmartRecruitersPosting {
  id: string;
  name: string;
  releasedDate?: string;
  location?: { city?: string; region?: string; country?: string; fullLocation?: string; remote?: boolean; hybrid?: boolean };
}

interface SmartRecruitersListResponse {
  totalFound?: number;
  content?: SmartRecruitersPosting[];
}

interface SmartRecruitersDetail {
  postingUrl?: string;
  jobAd?: {
    sections?: Record<"jobDescription" | "qualifications" | "additionalInformation", { text?: string } | undefined>;
  };
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
    remoteType?: string;
    country?: { descriptor?: string };
  };
}
