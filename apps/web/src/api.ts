export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface CareerProfile {
  id: string;
  name: string;
  domain: string;
  graduationYear?: number;
  experienceMonths: number;
  preferredRoles: string[];
  preferredLocations: string[];
  preferredWorkModes: string[];
  citizenshipCountry?: string;
  includeInternationalRoles?: boolean;
  targetCompanies: string[];
  excludedCompanies: string[];
  includedKeywords: string[];
  excludedKeywords: string[];
  skills: string[];
  seeksEmploymentTypes: string[];
}

export type CreateProfileInput = Omit<CareerProfile, "id">;

export interface SkillSuggestion {
  skill: string;
  matchedAlias: string;
}

export interface RoleSuggestion {
  role: string;
  domain: string;
  matchedAlias: string;
}

export interface DomainSuggestion {
  domain: string;
  score: number;
  evidence: string[];
}

export interface ProfileTargetSuggestion {
  roles: RoleSuggestion[];
  domains: DomainSuggestion[];
}

export interface Resume {
  id: string;
  profileId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey?: string;
  checksumSha256?: string;
  extractionStatus: string;
  isActive: boolean;
  createdAt: string;
}

export interface CompanyWatch {
  id: string;
  profileId: string;
  companyName: string;
  careersUrl: string;
  websiteUrl?: string;
  checkCadenceDays: number;
  lastCheckedAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastError?: string;
  consecutiveFailures?: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCompanyWatchInput {
  companyName: string;
  careersUrl: string;
  websiteUrl?: string;
  checkCadenceDays: number;
}

export interface WatchCheckSummary {
  checked: number;
  skipped: number;
  created: number;
  updated: number;
  failed: number;
  jobs: Job[];
}

export interface DiscoverySummary {
  checked: number;
  skippedSources: number;
  created: number;
  updated: number;
  skippedIneligible: number;
  failed: number;
  jobs: Job[];
  sources: Array<{
    sourceId: string;
    companyName: string;
    provider: string;
    fetched: number;
    stored: number;
    skippedIneligible: number;
    failed: boolean;
    error?: string;
  }>;
}

export interface UserNotification {
  id: string;
  profileId: string;
  type: "NEW_MATCHES";
  message: string;
  jobCount: number;
  readAt?: string;
  createdAt: string;
}

export interface Job {
  id: string;
  companyName: string;
  title: string;
  description: string;
  employmentType: string;
  seniority: string;
  domains: string[];
  skills: string[];
  locations: string[];
  workMode: string;
  applyUrl: string;
}

export interface Recommendation {
  job: Job;
  eligibility: string;
  score: number;
  reasons: string[];
  gaps: string[];
  state?: JobState;
}

export type JobState = "SAVED" | "HIDDEN" | "VIEWED" | "APPLIED";

export interface JobStateRecord {
  job: Job;
  state: JobState;
  applicationStage?: ApplicationStage;
  applicationNotes?: string;
  appliedAt?: string;
}

export type ApplicationStage = "APPLIED" | "INTERVIEWING" | "OFFER" | "REJECTED" | "WITHDRAWN";

export async function login(email: string, password: string): Promise<AuthResult> {
  const response = await apiRequest<{ data: AuthResult }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  return response.data;
}

export async function register(email: string, password: string, name?: string): Promise<AuthResult> {
  const response = await apiRequest<{ data: AuthResult }>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, ...(name === undefined || name.trim().length === 0 ? {} : { name }) })
  });

  return response.data;
}

export async function loginWithGoogle(idToken: string): Promise<AuthResult> {
  const response = await apiRequest<{ data: AuthResult }>("/api/v1/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken })
  });

  return response.data;
}

export async function getMe(accessToken: string): Promise<AuthUser> {
  const response = await apiRequest<{ data: AuthUser }>("/api/v1/auth/me", {
    accessToken
  });

  return response.data;
}

export async function refreshAuth(refreshToken: string): Promise<AuthResult> {
  const response = await apiRequest<{ data: AuthResult }>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken })
  });

  return response.data;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiRequest<void>("/api/v1/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken })
  });
}

export async function listProfiles(accessToken: string): Promise<CareerProfile[]> {
  const response = await apiRequest<{ data: CareerProfile[] }>("/api/v1/profiles", {
    accessToken
  });

  return response.data;
}

export async function createProfile(accessToken: string, input: CreateProfileInput): Promise<CareerProfile> {
  const response = await apiRequest<{ data: CareerProfile }>("/api/v1/profiles", {
    method: "POST",
    accessToken,
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function listResumes(accessToken: string, profileId: string): Promise<Resume[]> {
  const response = await apiRequest<{ data: Resume[] }>(`/api/v1/profiles/${profileId}/resumes`, {
    accessToken
  });

  return response.data;
}

export async function listResumeSkillSuggestions(
  accessToken: string,
  profileId: string,
  resumeId: string
): Promise<SkillSuggestion[]> {
  const response = await apiRequest<{ data: SkillSuggestion[] }>(
    `/api/v1/profiles/${profileId}/resumes/${resumeId}/suggested-skills`,
    { accessToken }
  );

  return response.data;
}

export async function listResumeTargetSuggestions(
  accessToken: string,
  profileId: string,
  resumeId: string
): Promise<ProfileTargetSuggestion> {
  const response = await apiRequest<{ data: ProfileTargetSuggestion }>(
    `/api/v1/profiles/${profileId}/resumes/${resumeId}/suggested-targets`,
    { accessToken }
  );

  return response.data;
}

export async function updateProfile(
  accessToken: string,
  profileId: string,
  input: Partial<
    Pick<
      CareerProfile,
      | "domain"
      | "experienceMonths"
      | "graduationYear"
      | "preferredRoles"
      | "preferredLocations"
      | "preferredWorkModes"
      | "citizenshipCountry"
      | "includeInternationalRoles"
      | "skills"
      | "seeksEmploymentTypes"
    >
  >
): Promise<CareerProfile> {
  const response = await apiRequest<{ data: CareerProfile }>(`/api/v1/profiles/${profileId}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function createResume(
  accessToken: string,
  profileId: string,
  file: File
): Promise<Resume> {
  const formData = new FormData();
  formData.set("resume", file);

  const response = await uploadRequest<{ data: Resume }>(`/api/v1/profiles/${profileId}/resumes`, {
    method: "POST",
    accessToken,
    body: formData
  });

  return response.data;
}

export async function activateResume(accessToken: string, profileId: string, resumeId: string): Promise<Resume> {
  const response = await apiRequest<{ data: Resume }>(`/api/v1/profiles/${profileId}/resumes/${resumeId}/activate`, {
    method: "PATCH",
    accessToken
  });

  return response.data;
}

export async function listCompanyWatches(accessToken: string, profileId: string): Promise<CompanyWatch[]> {
  const response = await apiRequest<{ data: CompanyWatch[] }>(`/api/v1/profiles/${profileId}/company-watches`, {
    accessToken
  });

  return response.data;
}

export async function createCompanyWatch(
  accessToken: string,
  profileId: string,
  input: CreateCompanyWatchInput
): Promise<CompanyWatch> {
  const response = await apiRequest<{ data: CompanyWatch }>(`/api/v1/profiles/${profileId}/company-watches`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function bulkCreateCompanyWatches(
  accessToken: string,
  profileId: string,
  watches: CreateCompanyWatchInput[]
): Promise<{ imported: number; watches: CompanyWatch[] }> {
  const response = await apiRequest<{ data: { imported: number; watches: CompanyWatch[] } }>(
    `/api/v1/profiles/${profileId}/company-watches/bulk`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify({ watches })
    }
  );

  return response.data;
}

export async function deleteCompanyWatch(accessToken: string, profileId: string, watchId: string): Promise<void> {
  await apiRequest<void>(`/api/v1/profiles/${profileId}/company-watches/${watchId}`, {
    method: "DELETE",
    accessToken
  });
}

export async function checkCompanyWatches(accessToken: string, profileId: string): Promise<WatchCheckSummary> {
  const response = await apiRequest<{ data: WatchCheckSummary }>(`/api/v1/profiles/${profileId}/company-watches/check-now`, {
    method: "POST",
    accessToken
  });

  return response.data;
}

export async function discoverProfileJobs(accessToken: string, profileId: string): Promise<DiscoverySummary> {
  const response = await apiRequest<{ data: DiscoverySummary }>(`/api/v1/profiles/${profileId}/discovery/check-now`, {
    method: "POST",
    accessToken
  });

  return response.data;
}

export async function listNotifications(accessToken: string): Promise<UserNotification[]> {
  const response = await apiRequest<{ data: UserNotification[] }>("/api/v1/notifications", { accessToken });
  return response.data;
}

export async function markNotificationRead(accessToken: string, notificationId: string): Promise<UserNotification> {
  const response = await apiRequest<{ data: UserNotification }>(`/api/v1/notifications/${notificationId}/read`, {
    method: "POST",
    accessToken
  });
  return response.data;
}

export async function listRecommendations(accessToken: string, profileId: string): Promise<Recommendation[]> {
  const response = await apiRequest<{ data: Recommendation[] }>(`/api/v1/profiles/${profileId}/recommendations`, {
    accessToken
  });

  return response.data;
}

export async function setJobState(
  accessToken: string,
  profileId: string,
  jobId: string,
  state: Exclude<JobState, "VIEWED">
): Promise<void> {
  const actionPath = state === "SAVED" ? "save" : state === "HIDDEN" ? "hide" : "mark-applied";
  await apiRequest<{ data: unknown }>(`/api/v1/profiles/${profileId}/jobs/${jobId}/${actionPath}`, {
    method: "POST",
    accessToken
  });
}

export async function updateJobApplication(
  accessToken: string,
  profileId: string,
  jobId: string,
  input: { applicationStage?: ApplicationStage; applicationNotes?: string }
): Promise<void> {
  await apiRequest<{ data: unknown }>(`/api/v1/profiles/${profileId}/jobs/${jobId}/application`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input)
  });
}

export async function clearJobState(accessToken: string, profileId: string, jobId: string): Promise<void> {
  await apiRequest<void>(`/api/v1/profiles/${profileId}/jobs/${jobId}/state`, {
    method: "DELETE",
    accessToken
  });
}

export async function listJobStates(accessToken: string, profileId: string, state: JobState): Promise<JobStateRecord[]> {
  const response = await apiRequest<{ data: JobStateRecord[] }>(
    `/api/v1/profiles/${profileId}/jobs/states?state=${state}`,
    {
      accessToken
    }
  );

  return response.data;
}

async function apiRequest<TResponse>(
  path: string,
  options: RequestInit & { accessToken?: string } = {}
): Promise<TResponse> {
  const headers = new Headers(options.headers);
  headers.set("content-type", "application/json");

  if (options.accessToken !== undefined) {
    headers.set("authorization", `Bearer ${options.accessToken}`);
  }

  const response = await fetch(toApiUrl(path), {
    ...options,
    headers
  });

  const json = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message =
      typeof json === "object" && json !== null && "error" in json && typeof json.error === "string"
        ? json.error
        : "Request failed";
    throw new Error(message);
  }

  return json as TResponse;
}

async function uploadRequest<TResponse>(
  path: string,
  options: RequestInit & { accessToken: string }
): Promise<TResponse> {
  const headers = new Headers(options.headers);
  headers.set("authorization", `Bearer ${options.accessToken}`);

  const response = await fetch(toApiUrl(path), {
    ...options,
    headers
  });

  const json = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message =
      typeof json === "object" && json !== null && "error" in json && typeof json.error === "string"
        ? json.error
        : "Upload failed";
    throw new Error(message);
  }

  return json as TResponse;
}

function toApiUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (baseUrl === undefined || baseUrl.trim().length === 0) {
    return path;
  }

  return `${baseUrl.replace(/\/$/, "")}${path}`;
}
