import {
  Bookmark,
  Bell,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  ExternalLink,
  EyeOff,
  KeyRound,
  Mail,
  LogOut,
  Plus,
  Radar,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
  UserRound
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  activateResume,
  bulkCreateCompanyWatches,
  checkCompanyWatches,
  clearJobState,
  createCompanyWatch,
  createProfile,
  createResume,
  deleteCompanyWatch,
  discoverProfileJobs,
  getMe,
  listCompanyWatches,
  listJobStates,
  listProfiles,
  listRecommendations,
  listResumes,
  listResumeSkillSuggestions,
  listResumeTargetSuggestions,
  login,
  loginWithGoogle,
  listNotifications,
  logout,
  markNotificationRead,
  refreshAuth,
  register,
  setJobState,
  updateJobApplication,
  updateProfile,
  type AuthResult,
  type ApplicationStage,
  type CareerProfile,
  type CompanyWatch,
  type CreateCompanyWatchInput,
  type CreateProfileInput,
  type DiscoverySummary,
  type Job,
  type JobState,
  type JobStateRecord,
  type ProfileTargetSuggestion,
  type Recommendation,
  type Resume,
  type SkillSuggestion,
  type WatchCheckSummary
  , type UserNotification
} from "./api.js";

const tabs = ["ALL", "SAVED", "APPLIED", "HIDDEN"] as const;
const workspaceViews = ["JOBS", "PROFILE", "SOURCES"] as const;
const profileDomains = [
  "SOFTWARE",
  "DIGITAL_HARDWARE",
  "EMBEDDED",
  "DATA_ML",
  "RESEARCH",
  "MECHANICAL",
  "CIVIL",
  "ELECTRICAL",
  "PRODUCT",
  "DESIGN",
  "MARKETING",
  "SALES",
  "FINANCE",
  "HUMAN_RESOURCES",
  "OPERATIONS",
  "CUSTOMER_SUPPORT",
  "GENERAL"
] as const;
const workModes = ["ONSITE", "HYBRID", "REMOTE"] as const;
const employmentTypes = ["FULL_TIME", "INTERNSHIP", "CONTRACT", "PART_TIME"] as const;
const seniorityFilters = ["FRESHER", "ENTRY_LEVEL", "MID_LEVEL", "SENIOR"] as const;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const authStorageKey = "roleradar.accessToken";
const refreshStorageKey = "roleradar.refreshToken";
const applicationStages = ["APPLIED", "INTERVIEWING", "OFFER", "REJECTED", "WITHDRAWN"] as const;

type RecommendationTab = (typeof tabs)[number];
type WorkspaceView = (typeof workspaceViews)[number];
type DisplayItem =
  | { kind: "recommendation"; recommendation: Recommendation }
  | { kind: "state"; stateRecord: JobStateRecord };
type ProfileFormState = {
  domain: string;
  experienceMonths: string;
  graduationYear: string;
  preferredRoles: string;
  preferredLocations: string;
  preferredWorkModes: string[];
  citizenshipCountry: string;
  includeInternationalRoles: boolean;
  skills: string;
  seeksEmploymentTypes: string[];
};
type JobFilters = {
  domain: string;
  location: string;
  seniority: string;
  workMode: string;
  companyType: string;
};
type CompanyWatchFormState = {
  companyName: string;
  careersUrl: string;
  websiteUrl: string;
  checkCadenceDays: string;
};
type AuthMode = "SIGN_IN" | "REGISTER";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(input: { client_id: string; callback: (response: { credential?: string }) => void }): void;
          renderButton(parent: HTMLElement, options: { theme: string; size: string; width?: number }): void;
        };
      };
    };
  }
}

const emptyProfileForm: ProfileFormState = {
  domain: "SOFTWARE",
  experienceMonths: "0",
  graduationYear: "",
  preferredRoles: "",
  preferredLocations: "",
  preferredWorkModes: [],
  citizenshipCountry: "India",
  includeInternationalRoles: false,
  skills: "",
  seeksEmploymentTypes: []
};
const emptyCompanyWatchForm: CompanyWatchFormState = {
  companyName: "",
  careersUrl: "",
  websiteUrl: "",
  checkCadenceDays: "1"
};

export function App(): JSX.Element {
  const [authMode, setAuthMode] = useState<AuthMode>("SIGN_IN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [auth, setAuth] = useState<AuthResult | null>(null);
  const [profiles, setProfiles] = useState<CareerProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(50);
  const recommendationRequestRef = useRef(0);
  const selectedProfileRef = useRef<string | null>(null);
  const feedCacheRef = useRef(new Map<string, { recommendations: Recommendation[]; stateRecords: JobStateRecord[] }>());
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [companyWatches, setCompanyWatches] = useState<CompanyWatch[]>([]);
  const [companyWatchForm, setCompanyWatchForm] = useState<CompanyWatchFormState>(emptyCompanyWatchForm);
  const [selectedCompanyCsv, setSelectedCompanyCsv] = useState<File | null>(null);
  const [lastWatchCheckSummary, setLastWatchCheckSummary] = useState<WatchCheckSummary | null>(null);
  const [lastDiscoverySummary, setLastDiscoverySummary] = useState<DiscoverySummary | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [selectedResumeFile, setSelectedResumeFile] = useState<File | null>(null);
  const [skillSuggestions, setSkillSuggestions] = useState<SkillSuggestion[]>([]);
  const [targetSuggestions, setTargetSuggestions] = useState<ProfileTargetSuggestion>({ roles: [], domains: [] });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [stateRecords, setStateRecords] = useState<JobStateRecord[]>([]);
  const [activeTab, setActiveTab] = useState<RecommendationTab>("ALL");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("JOBS");
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [jobFilters, setJobFilters] = useState<JobFilters>({
    companyType: "",
    domain: "",
    location: "",
    seniority: "",
    workMode: ""
  });
  const [applicationDrafts, setApplicationDrafts] = useState<Record<string, { applicationStage: ApplicationStage; applicationNotes: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isScanningJobs, setIsScanningJobs] = useState(false);
  const [isRestoringAuth, setIsRestoringAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  selectedProfileRef.current = selectedProfileId;
  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );
  const activeResume = useMemo(() => resumes.find((resume) => resume.isActive) ?? null, [resumes]);

  async function acceptAuthResult(result: AuthResult): Promise<void> {
    const [nextProfiles, nextNotifications] = await Promise.all([
      listProfiles(result.accessToken),
      listNotifications(result.accessToken)
    ]);
    localStorage.setItem(authStorageKey, result.accessToken);
    if (result.refreshToken.trim().length > 0) {
      localStorage.setItem(refreshStorageKey, result.refreshToken);
    }
    setAuth(result);
    setProfiles(nextProfiles);
    setNotifications(nextNotifications);
    setSelectedProfileId(nextProfiles[0]?.id ?? null);
    setWorkspaceView(nextProfiles.length === 0 ? "PROFILE" : "JOBS");
  }

  async function handleLogin(event?: React.FormEvent<HTMLFormElement>): Promise<void> {
    event?.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await login(email, password);
      await acceptAuthResult(result);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(event?: React.FormEvent<HTMLFormElement>): Promise<void> {
    event?.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await register(email, password, name);
      await acceptAuthResult(result);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleCredential(idToken: string): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loginWithGoogle(idToken);
      await acceptAuthResult(result);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Google sign-in failed");
    } finally {
      setIsLoading(false);
    }
  }

  function handleAuthModeChange(nextMode: AuthMode): void {
    setAuthMode(nextMode);
    setError(null);
  }

  useEffect(() => {
    const storedAccessToken = localStorage.getItem(authStorageKey);
    const storedRefreshToken = localStorage.getItem(refreshStorageKey);
    if (storedAccessToken === null && storedRefreshToken === null) {
      setIsRestoringAuth(false);
      return;
    }

    async function restoreAuth(): Promise<void> {
      try {
        if (storedAccessToken !== null) {
          const user = await getMe(storedAccessToken);
          await acceptAuthResult({ user, accessToken: storedAccessToken, refreshToken: storedRefreshToken ?? "" });
          return;
        }

        if (storedRefreshToken !== null) {
          await acceptAuthResult(await refreshAuth(storedRefreshToken));
        }
      } catch {
        if (storedRefreshToken !== null) {
          try {
            await acceptAuthResult(await refreshAuth(storedRefreshToken));
          } catch {
            localStorage.removeItem(authStorageKey);
            localStorage.removeItem(refreshStorageKey);
          }
        } else {
          localStorage.removeItem(authStorageKey);
          localStorage.removeItem(refreshStorageKey);
        }
      } finally {
        setIsRestoringAuth(false);
      }
    }

    void restoreAuth();
  }, []);

  function handleLogout(): void {
    const storedRefreshToken = localStorage.getItem(refreshStorageKey);
    if (storedRefreshToken !== null) {
      void logout(storedRefreshToken).catch(() => undefined);
    }
    localStorage.removeItem(authStorageKey);
    localStorage.removeItem(refreshStorageKey);
    setAuth(null);
    feedCacheRef.current.clear();
    setProfiles([]);
    setSelectedProfileId(null);
    setRecommendations([]);
    setStateRecords([]);
    setResumes([]);
    setCompanyWatches([]);
    setLastWatchCheckSummary(null);
    setNotifications([]);
    setSkillSuggestions([]);
    setTargetSuggestions({ roles: [], domains: [] });
    setWorkspaceView("JOBS");
    setIsCreatingProfile(false);
    setApplicationDrafts({});
  }

  function startCreatingProfile(): void {
    setProfileForm({
      ...emptyProfileForm,
      preferredWorkModes: ["HYBRID", "REMOTE"],
      seeksEmploymentTypes: ["FULL_TIME"]
    });
    setIsCreatingProfile(true);
    setWorkspaceView("PROFILE");
    setError(null);
  }

  async function refreshRecommendations(profileId: string): Promise<void> {
    if (auth === null) return;

    // Only the most recent request may write state; otherwise a slow response
    // for the previously selected profile overwrites the one now on screen.
    const requestId = recommendationRequestRef.current + 1;
    recommendationRequestRef.current = requestId;
    const tab = activeTab;
    const cacheKey = `${profileId}:${tab}`;
    const cached = feedCacheRef.current.get(cacheKey);

    if (cached === undefined) {
      setRecommendations([]);
      setStateRecords([]);
      setIsLoading(true);
    } else {
      setRecommendations(cached.recommendations);
      setStateRecords(cached.stateRecords);
    }
    setError(null);

    try {
      const next =
        tab === "ALL"
          ? { recommendations: await listRecommendations(auth.accessToken, profileId), stateRecords: [] as JobStateRecord[] }
          : { recommendations: [] as Recommendation[], stateRecords: await listJobStates(auth.accessToken, profileId, tab) };
      feedCacheRef.current.set(cacheKey, next);
      if (recommendationRequestRef.current !== requestId) return;
      setRecommendations(next.recommendations);
      setStateRecords(next.stateRecords);
    } catch (caughtError) {
      if (recommendationRequestRef.current !== requestId) return;
      setError(caughtError instanceof Error ? caughtError.message : "Could not load recommendations");
    } finally {
      if (recommendationRequestRef.current === requestId) setIsLoading(false);
    }
  }

  async function handleMarkNotificationRead(notificationId: string): Promise<void> {
    if (auth === null) return;
    try {
      const notification = await markNotificationRead(auth.accessToken, notificationId);
      setNotifications((current) => current.map((item) => (item.id === notification.id ? notification : item)));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update notification");
    }
  }

  async function refreshResumes(profileId: string): Promise<void> {
    if (auth === null) return;

    try {
      const nextResumes = await listResumes(auth.accessToken, profileId);
      if (selectedProfileRef.current !== profileId) return;
      const nextActiveResume = nextResumes.find((resume) => resume.isActive) ?? null;
      setResumes(nextResumes);
      if (nextActiveResume?.extractionStatus === "COMPLETED") {
        const [nextSkillSuggestions, nextTargetSuggestions] = await Promise.all([
          listResumeSkillSuggestions(auth.accessToken, profileId, nextActiveResume.id),
          listResumeTargetSuggestions(auth.accessToken, profileId, nextActiveResume.id)
        ]);
        setSkillSuggestions(nextSkillSuggestions);
        setTargetSuggestions(nextTargetSuggestions);
      } else {
        setSkillSuggestions([]);
        setTargetSuggestions({ roles: [], domains: [] });
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load resumes");
    }
  }

  async function refreshCompanyWatches(profileId: string): Promise<void> {
    if (auth === null) return;

    try {
      const nextWatches = await listCompanyWatches(auth.accessToken, profileId);
      if (selectedProfileRef.current === profileId) setCompanyWatches(nextWatches);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load company watches");
    }
  }

  async function applySuggestedSkills(): Promise<void> {
    if (auth === null || selectedProfileId === null || selectedProfile === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const mergedSkills = mergeStrings(selectedProfile.skills, skillSuggestions.map((suggestion) => suggestion.skill));
      const updatedProfile = await updateProfile(auth.accessToken, selectedProfileId, { skills: mergedSkills });
      setProfiles((currentProfiles) =>
        currentProfiles.map((profile) => (profile.id === updatedProfile.id ? updatedProfile : profile))
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not apply skills");
    } finally {
      setIsLoading(false);
    }
  }

  async function applySuggestedTargets(): Promise<void> {
    if (auth === null || selectedProfileId === null || selectedProfile === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const mergedRoles = mergeStrings(
        selectedProfile.preferredRoles,
        targetSuggestions.roles.map((suggestion) => suggestion.role)
      );
      const topDomain = targetSuggestions.domains[0];
      const secondDomain = targetSuggestions.domains[1];
      const preferredDomain =
        topDomain !== undefined && (secondDomain === undefined || topDomain.score > secondDomain.score)
          ? topDomain.domain
          : selectedProfile.domain;
      const updatedProfile = await updateProfile(auth.accessToken, selectedProfileId, {
        preferredRoles: mergedRoles,
        domain: preferredDomain
      });
      setProfiles((currentProfiles) =>
        currentProfiles.map((profile) => (profile.id === updatedProfile.id ? updatedProfile : profile))
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not apply target roles");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleProfileSave(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (auth === null || selectedProfileId === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const updateInput: Parameters<typeof updateProfile>[2] = {
        domain: profileForm.domain,
        experienceMonths: parseRequiredNumber(profileForm.experienceMonths, "Experience"),
        preferredRoles: splitCsv(profileForm.preferredRoles),
        preferredLocations: splitCsv(profileForm.preferredLocations),
        preferredWorkModes: profileForm.preferredWorkModes,
        citizenshipCountry: profileForm.citizenshipCountry,
        includeInternationalRoles: profileForm.includeInternationalRoles,
        skills: splitCsv(profileForm.skills),
        seeksEmploymentTypes: profileForm.seeksEmploymentTypes
      };
      const graduationYear = parseOptionalNumber(profileForm.graduationYear, "Graduation year");
      if (graduationYear !== undefined) {
        updateInput.graduationYear = graduationYear;
      }

      const updatedProfile = await updateProfile(auth.accessToken, selectedProfileId, updateInput);
      setProfiles((currentProfiles) =>
        currentProfiles.map((profile) => (profile.id === updatedProfile.id ? updatedProfile : profile))
      );
      await refreshRecommendations(selectedProfileId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save profile");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateProfile(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (auth === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const input = buildProfileInput(profileForm, profileForm.preferredRoles.split(",")[0]?.trim() || "My Role");
      const profile = await createProfile(auth.accessToken, input);
      setProfiles((currentProfiles) => [...currentProfiles, profile]);
      setSelectedProfileId(profile.id);
      setIsCreatingProfile(false);
      setWorkspaceView("SOURCES");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not create profile");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateCompanyWatch(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (auth === null || selectedProfileId === null) return;

    setIsLoading(true);
    setError(null);

    try {
      await createCompanyWatch(auth.accessToken, selectedProfileId, {
        companyName: companyWatchForm.companyName,
        careersUrl: companyWatchForm.careersUrl,
        ...(companyWatchForm.websiteUrl.trim().length === 0 ? {} : { websiteUrl: companyWatchForm.websiteUrl }),
        checkCadenceDays: parseRequiredNumber(companyWatchForm.checkCadenceDays, "Check cadence")
      });
      setCompanyWatchForm(emptyCompanyWatchForm);
      setLastWatchCheckSummary(null);
      await refreshCompanyWatches(selectedProfileId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not add company");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleImportCompanyCsv(): Promise<void> {
    if (auth === null || selectedProfileId === null || selectedCompanyCsv === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const csvText = await selectedCompanyCsv.text();
      const watches = parseCompanyWatchCsv(csvText);
      await bulkCreateCompanyWatches(auth.accessToken, selectedProfileId, watches);
      setSelectedCompanyCsv(null);
      setLastWatchCheckSummary(null);
      await refreshCompanyWatches(selectedProfileId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not import CSV");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteCompanyWatch(watchId: string): Promise<void> {
    if (auth === null || selectedProfileId === null) return;

    setIsLoading(true);
    setError(null);

    try {
      await deleteCompanyWatch(auth.accessToken, selectedProfileId, watchId);
      setLastWatchCheckSummary(null);
      await refreshCompanyWatches(selectedProfileId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not remove company");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCheckCompanyWatches(): Promise<void> {
    if (auth === null || selectedProfileId === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const summary = await checkCompanyWatches(auth.accessToken, selectedProfileId);
      setLastWatchCheckSummary(summary);
      await refreshCompanyWatches(selectedProfileId);
      await refreshRecommendations(selectedProfileId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not fetch real jobs");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDiscoverProfileJobs(): Promise<void> {
    if (auth === null || selectedProfileId === null) return;

    setIsLoading(true);
    setIsScanningJobs(true);
    setError(null);

    try {
      const summary = await discoverProfileJobs(auth.accessToken, selectedProfileId);
      setLastDiscoverySummary(summary);
      await refreshRecommendations(selectedProfileId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not discover matching jobs");
    } finally {
      setIsScanningJobs(false);
      setIsLoading(false);
    }
  }

  async function handleCreateResume(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (auth === null || selectedProfileId === null) return;

    setIsLoading(true);
    setError(null);

    try {
      if (selectedResumeFile === null) {
        throw new Error("Choose a resume PDF first");
      }

      await createResume(auth.accessToken, selectedProfileId, selectedResumeFile);
      setSelectedResumeFile(null);
      await refreshResumes(selectedProfileId);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not create resume";
      setError(
        message === "Resume storage is not configured"
          ? "Resume storage is not configured. Add SUPABASE_URL, SUPABASE_SECRET_KEY, and SUPABASE_RESUME_BUCKET in apps/api/.env, then restart the API."
          : message
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleActivateResume(resumeId: string): Promise<void> {
    if (auth === null || selectedProfileId === null) return;

    setIsLoading(true);
    setError(null);

    try {
      await activateResume(auth.accessToken, selectedProfileId, resumeId);
      await refreshResumes(selectedProfileId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not activate resume");
    } finally {
      setIsLoading(false);
    }
  }

  async function updateJobState(jobId: string, state: Exclude<JobState, "VIEWED">): Promise<void> {
    if (auth === null || selectedProfileId === null) return;

    setIsLoading(true);
    setError(null);

    try {
      await setJobState(auth.accessToken, selectedProfileId, jobId, state);
      await refreshRecommendations(selectedProfileId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update job state");
      setIsLoading(false);
    }
  }

  async function resetJobState(jobId: string): Promise<void> {
    if (auth === null || selectedProfileId === null) return;

    setIsLoading(true);
    setError(null);

    try {
      await clearJobState(auth.accessToken, selectedProfileId, jobId);
      await refreshRecommendations(selectedProfileId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not clear job state");
      setIsLoading(false);
    }
  }

  async function saveApplicationTracking(jobId: string): Promise<void> {
    if (auth === null || selectedProfileId === null) return;

    const draft = applicationDrafts[jobId];
    if (draft === undefined) return;

    setIsLoading(true);
    setError(null);

    try {
      await updateJobApplication(auth.accessToken, selectedProfileId, jobId, draft);
      await refreshRecommendations(selectedProfileId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save application tracking");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setVisibleLimit(50);
  }, [selectedProfileId, activeTab, jobFilters]);

  useEffect(() => {
    if (selectedProfileId !== null) {
      void refreshRecommendations(selectedProfileId);
      void refreshResumes(selectedProfileId);
      void refreshCompanyWatches(selectedProfileId);
    }
  }, [selectedProfileId, activeTab]);

  useEffect(() => {
    if (selectedProfile !== null && !isCreatingProfile) {
      setProfileForm(toProfileFormState(selectedProfile));
      setSelectedResumeFile(null);
      setJobFilters({ domain: "", location: "", seniority: "", workMode: "", companyType: "" });
    }
  }, [selectedProfile, isCreatingProfile]);

  useEffect(() => {
    const nextDrafts: Record<string, { applicationStage: ApplicationStage; applicationNotes: string }> = {};
    for (const stateRecord of stateRecords) {
      if (stateRecord.state === "APPLIED") {
        nextDrafts[stateRecord.job.id] = {
          applicationStage: stateRecord.applicationStage ?? "APPLIED",
          applicationNotes: stateRecord.applicationNotes ?? ""
        };
      }
    }
    setApplicationDrafts(nextDrafts);
  }, [stateRecords]);

  useEffect(() => {
    if (auth !== null || googleClientId === undefined || googleClientId.trim().length === 0 || googleButtonRef.current === null) {
      return;
    }

    const renderButton = (): void => {
      if (window.google === undefined || googleButtonRef.current === null) return;
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (response.credential !== undefined) {
            void handleGoogleCredential(response.credential);
          }
        }
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: 240
      });
    };

    if (window.google !== undefined) {
      renderButton();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    script.onerror = () => {
      setError("Google sign-in could not load. Check your network connection and try again.");
    };
    document.head.append(script);
  }, [auth, isRestoringAuth]);

  const displayItems: DisplayItem[] =
    activeTab === "ALL"
      ? recommendations.map((recommendation) => ({ kind: "recommendation", recommendation }))
      : stateRecords.map((stateRecord) => ({ kind: "state", stateRecord }));
  const filteredDisplayItems = displayItems.filter((item) => matchesJobFilters(getDisplayJob(item), jobFilters));
  const visibleEligibleCount = filteredDisplayItems.filter(
    (item) => item.kind === "recommendation" && item.recommendation.eligibility === "ELIGIBLE"
  ).length;
  const savedCount =
    activeTab === "SAVED"
      ? stateRecords.length
      : recommendations.filter((recommendation) => recommendation.state === "SAVED").length;
  const showCreateProfilePanel = profiles.length === 0 || isCreatingProfile;

  if (isRestoringAuth) {
    return (
      <main className="auth-page">
        <nav className="auth-nav" aria-label="RoleRadar">
          <div className="brand-lockup">
            <div className="brand-mark">
              <Radar size={22} aria-hidden="true" />
            </div>
            <strong>RoleRadar</strong>
          </div>
          <span>Career intelligence for targeted roles</span>
        </nav>
        <section className="empty-state auth-loading">
          <RefreshCw size={28} aria-hidden="true" />
          <h3>Restoring your workspace</h3>
          <p>Checking your saved session.</p>
        </section>
      </main>
    );
  }

  if (auth === null) {
    return (
      <main className="auth-page">
        <nav className="auth-nav" aria-label="RoleRadar">
          <div className="brand-lockup">
            <div className="brand-mark">
              <Radar size={22} aria-hidden="true" />
            </div>
            <strong>RoleRadar</strong>
          </div>
          <span>Career intelligence for targeted roles</span>
        </nav>

        <section className="auth-hero">
          <div className="auth-copy">
            <p className="eyebrow">Private job radar</p>
            <h1>Find roles that actually fit your profile.</h1>
            <p>
              RoleRadar keeps your search focused on experience, location, resume signals, and the company portals you
              care about.
            </p>
          </div>

          <section className="auth-panel" aria-label="Account access">
            <div className="auth-panel-header">
              <p className="eyebrow">Account access</p>
              <h2>{authMode === "SIGN_IN" ? "Log in to RoleRadar" : "Sign up for RoleRadar"}</h2>
              <p>
                {authMode === "SIGN_IN"
                  ? "Use your existing account to continue your job search."
                  : "Create an account to save profiles, resumes, watched companies, and applications."}
              </p>
            </div>
            <div className="auth-switch" aria-label="Authentication mode">
              <button
                className={authMode === "SIGN_IN" ? "active" : ""}
                onClick={() => handleAuthModeChange("SIGN_IN")}
                type="button"
              >
                Log in
              </button>
              <button
                className={authMode === "REGISTER" ? "active" : ""}
                onClick={() => handleAuthModeChange("REGISTER")}
                type="button"
              >
                Sign up
              </button>
            </div>

            {googleClientId !== undefined && googleClientId.trim().length > 0 ? (
              <div className="google-auth-row">
                <div className="google-button" ref={googleButtonRef} />
              </div>
            ) : (
              <button className="secondary-button full-button" disabled type="button">
                Google sign-in not configured
              </button>
            )}

            <div className="auth-divider">or use email</div>

            <form
              className="auth-form"
              onSubmit={(event) => (authMode === "SIGN_IN" ? void handleLogin(event) : void handleRegister(event))}
            >
              {authMode === "REGISTER" && (
                <label>
                  Name
                  <div className="input-with-icon">
                    <UserRound size={17} aria-hidden="true" />
                    <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
                  </div>
                </label>
              )}
              <label>
                Email
                <div className="input-with-icon">
                  <Mail size={17} aria-hidden="true" />
                  <input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
              </label>
              <label>
                Password
                <div className="input-with-icon">
                  <KeyRound size={17} aria-hidden="true" />
                  <input
                    autoComplete={authMode === "SIGN_IN" ? "current-password" : "new-password"}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </label>
              <button className="primary-button full-button" type="submit" disabled={isLoading}>
                <KeyRound size={16} aria-hidden="true" />
                {isLoading ? "Working" : authMode === "SIGN_IN" ? "Log in with email" : "Create account"}
              </button>
            </form>

            <p className="auth-helper">
              {authMode === "SIGN_IN" ? "New to RoleRadar?" : "Already have an account?"}{" "}
              <button
                onClick={() => handleAuthModeChange(authMode === "SIGN_IN" ? "REGISTER" : "SIGN_IN")}
                type="button"
              >
                {authMode === "SIGN_IN" ? "Sign up" : "Log in"}
              </button>
            </p>
            {error !== null && <div className="error-banner compact">{error}</div>}
          </section>

          <ul className="auth-proof-list" aria-label="RoleRadar capabilities">
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Match roles by experience level, location, domain, and skills.
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Watch company career pages without checking each one manually.
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Keep separate profiles and resumes for different target roles.
            </li>
          </ul>
        </section>
      </main>
    );
  }

  return (
    <main className="product-shell">
      <header className="product-nav">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Radar size={22} aria-hidden="true" />
          </div>
          <strong>RoleRadar</strong>
        </div>
        <nav className="workspace-tabs" aria-label="Workspace sections">
          {workspaceViews.map((view) => (
            <button
              className={workspaceView === view ? "workspace-tab active" : "workspace-tab"}
              key={view}
              onClick={() => setWorkspaceView(view)}
              type="button"
            >
              {formatDomain(view)}
            </button>
          ))}
        </nav>
        <div className="account-menu">
          <div className="account-avatar">
            <UserRound size={17} aria-hidden="true" />
          </div>
          <div>
            <strong>{auth.user.name ?? "RoleRadar User"}</strong>
            <span>{auth.user.email}</span>
          </div>
          <button className="icon-button" onClick={handleLogout} title="Log out" type="button">
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Recommendations</p>
            <h2>{selectedProfile?.name ?? "Create your first profile"}</h2>
            {selectedProfile !== null && (
              <p className="topbar-subtitle">
                {formatDomain(selectedProfile.domain)} · {selectedProfile.experienceMonths} months experience
              </p>
            )}
          </div>
          {workspaceView === "JOBS" && (
            <div className="topbar-actions">
              <button
                className="icon-button"
                disabled={selectedProfileId === null || isLoading}
                onClick={() => selectedProfileId !== null && void refreshRecommendations(selectedProfileId)}
                title="Reload stored jobs"
                type="button"
              >
                <RefreshCw size={18} aria-hidden="true" />
              </button>
              <button
                className="primary-button scan-jobs-button"
                disabled={selectedProfileId === null || isLoading}
                onClick={() => void handleDiscoverProfileJobs()}
                type="button"
              >
                <Radar size={16} aria-hidden="true" />
                {isScanningJobs ? "Scanning jobs..." : "Scan jobs"}
              </button>
            </div>
          )}
        </header>

        {showCreateProfilePanel && (
          <section className="onboarding-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{profiles.length === 0 ? "First profile" : "New role profile"}</p>
                <h3>{profiles.length === 0 ? "Create your role radar" : "Add another target role"}</h3>
                <p className="section-copy">
                  Define the role, location, and experience rules first. After this, upload a resume and add watched
                  companies for this specific profile.
                </p>
              </div>
              {profiles.length > 0 && (
                <button
                  className="secondary-button"
                  onClick={() => {
                    setIsCreatingProfile(false);
                    if (selectedProfile !== null) {
                      setProfileForm(toProfileFormState(selectedProfile));
                    }
                  }}
                  type="button"
                >
                  Cancel
                </button>
              )}
            </div>
            <form onSubmit={(event) => void handleCreateProfile(event)}>
              <div className="form-grid">
                <label>
                  Target role
                  <input
                    placeholder="Backend Engineer"
                    value={profileForm.preferredRoles}
                    onChange={(event) => setProfileForm((current) => ({ ...current, preferredRoles: event.target.value }))}
                  />
                </label>
                <label>
                  Domain
                  <select
                    value={profileForm.domain}
                    onChange={(event) => setProfileForm((current) => ({ ...current, domain: event.target.value }))}
                  >
                    {profileDomains.map((domain) => (
                      <option key={domain} value={domain}>
                        {formatDomain(domain)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Experience months
                  <input
                    min="0"
                    type="number"
                    value={profileForm.experienceMonths}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, experienceMonths: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Locations
                  <input
                    placeholder="Bengaluru, Remote"
                    value={profileForm.preferredLocations}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, preferredLocations: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Skills
                  <input
                    placeholder="TypeScript, Node.js, PostgreSQL"
                    value={profileForm.skills}
                    onChange={(event) => setProfileForm((current) => ({ ...current, skills: event.target.value }))}
                  />
                </label>
                <label>
                  Graduation year
                  <input
                    min="1950"
                    max="2100"
                    type="number"
                    value={profileForm.graduationYear}
                    onChange={(event) => setProfileForm((current) => ({ ...current, graduationYear: event.target.value }))}
                  />
                </label>
                <label>
                  Citizenship / work country
                  <input
                    placeholder="India"
                    value={profileForm.citizenshipCountry}
                    onChange={(event) => setProfileForm((current) => ({ ...current, citizenshipCountry: event.target.value }))}
                  />
                </label>
              </div>
              <div className="toggle-group" aria-label="Preferred work modes for new profile">
                {workModes.map((mode) => (
                  <label key={mode}>
                    <input
                      checked={profileForm.preferredWorkModes.includes(mode)}
                      onChange={() =>
                        setProfileForm((current) => ({
                          ...current,
                          preferredWorkModes: toggleString(current.preferredWorkModes, mode)
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{formatDomain(mode)}</span>
                  </label>
                ))}
              </div>
              <div className="toggle-group" aria-label="Employment types for new profile">
                {employmentTypes.map((type) => (
                  <label key={type}>
                    <input
                      checked={profileForm.seeksEmploymentTypes.includes(type)}
                      onChange={() =>
                        setProfileForm((current) => ({
                          ...current,
                          seeksEmploymentTypes: toggleString(current.seeksEmploymentTypes, type)
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{formatDomain(type)}</span>
                  </label>
                ))}
              </div>
              <div className="toggle-group" aria-label="International roles for new profile">
                <label>
                  <input
                    checked={profileForm.includeInternationalRoles}
                    onChange={() =>
                      setProfileForm((current) => ({ ...current, includeInternationalRoles: !current.includeInternationalRoles }))
                    }
                    type="checkbox"
                  />
                  <span>Include international roles</span>
                </label>
              </div>
              <div className="onboarding-actions">
                <button className="primary-button" disabled={isLoading} type="submit">
                  <Plus size={15} aria-hidden="true" />
                  {profiles.length === 0 ? "Create profile" : "Add profile"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="profile-strip" aria-label="Career profiles">
          <div className="profile-chips">
            {profiles.map((profile) => (
              <button
                className={profile.id === selectedProfileId ? "profile-button active" : "profile-button"}
                key={profile.id}
                onClick={() => setSelectedProfileId(profile.id)}
                type="button"
              >
                <span>{profile.name}</span>
                <small>{formatDomain(profile.domain)}</small>
              </button>
            ))}
            {profiles.length > 0 && (
              <button className="profile-add-button" onClick={startCreatingProfile} type="button">
                <Plus size={16} aria-hidden="true" />
                Add role profile
              </button>
            )}
          </div>
          <section className="metric-strip" aria-label="Profile status">
            <div>
              <span>Visible jobs</span>
              <strong>{filteredDisplayItems.length}</strong>
            </div>
            <div>
              <span>Eligible</span>
              <strong>{visibleEligibleCount}</strong>
            </div>
            <div>
              <span>Saved</span>
              <strong>{savedCount}</strong>
            </div>
            <div>
              <span>Watched</span>
              <strong>{companyWatches.length}</strong>
            </div>
          </section>
        </section>

        {selectedProfile !== null && workspaceView === "PROFILE" && !isCreatingProfile && (
          <section className="profile-summary">
            <div>
              <span>Roles</span>
              <strong>{selectedProfile.preferredRoles.slice(0, 3).join(", ") || "Not set"}</strong>
            </div>
            <div>
              <span>Locations</span>
              <strong>{selectedProfile.preferredLocations.slice(0, 3).join(", ") || "Not set"}</strong>
            </div>
            <div>
              <span>Skills</span>
              <strong>{selectedProfile.skills.slice(0, 4).join(", ") || "Not set"}</strong>
            </div>
          </section>
        )}

        {selectedProfile !== null && workspaceView === "JOBS" && (
          <section className="notification-panel" aria-label="New job alerts">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Alerts</p>
                <h3>New matches</h3>
              </div>
              <Bell size={18} aria-hidden="true" />
            </div>
            {notifications.filter((notification) => notification.profileId === selectedProfile.id && notification.readAt === undefined).length === 0 ? (
              <p className="section-copy">No unread matching-job alerts for this profile.</p>
            ) : (
              <div className="notification-list">
                {notifications
                  .filter((notification) => notification.profileId === selectedProfile.id && notification.readAt === undefined)
                  .slice(0, 3)
                  .map((notification) => (
                    <div className="notification-item" key={notification.id}>
                      <span>{notification.message}</span>
                      <button
                        className="secondary-button compact-button"
                        onClick={() => void handleMarkNotificationRead(notification.id)}
                        type="button"
                      >
                        Mark read
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </section>
        )}

        {selectedProfile !== null && workspaceView === "PROFILE" && !isCreatingProfile && (
          <section className="profile-editor">
            <form onSubmit={(event) => void handleProfileSave(event)}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Profile</p>
                  <h3>Matching inputs</h3>
                </div>
                <button className="primary-button compact-button" disabled={isLoading} type="submit">
                  <Save size={15} aria-hidden="true" />
                  Save
                </button>
              </div>

              <div className="form-grid">
                <label>
                  Domain
                  <select
                    value={profileForm.domain}
                    onChange={(event) => setProfileForm((current) => ({ ...current, domain: event.target.value }))}
                  >
                    {profileDomains.map((domain) => (
                      <option key={domain} value={domain}>
                        {formatDomain(domain)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Experience months
                  <input
                    min="0"
                    type="number"
                    value={profileForm.experienceMonths}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, experienceMonths: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Graduation year
                  <input
                    min="1950"
                    max="2100"
                    type="number"
                    value={profileForm.graduationYear}
                    onChange={(event) => setProfileForm((current) => ({ ...current, graduationYear: event.target.value }))}
                  />
                </label>
                <label>
                  Roles
                  <input
                    value={profileForm.preferredRoles}
                    onChange={(event) => setProfileForm((current) => ({ ...current, preferredRoles: event.target.value }))}
                  />
                </label>
                <label>
                  Locations
                  <input
                    value={profileForm.preferredLocations}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, preferredLocations: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Skills
                  <input
                    value={profileForm.skills}
                    onChange={(event) => setProfileForm((current) => ({ ...current, skills: event.target.value }))}
                  />
                </label>
                <label>
                  Citizenship / work country
                  <input
                    value={profileForm.citizenshipCountry}
                    onChange={(event) => setProfileForm((current) => ({ ...current, citizenshipCountry: event.target.value }))}
                  />
                </label>
              </div>

              <div className="toggle-group" aria-label="Preferred work modes">
                {workModes.map((mode) => (
                  <label key={mode}>
                    <input
                      checked={profileForm.preferredWorkModes.includes(mode)}
                      onChange={() =>
                        setProfileForm((current) => ({
                          ...current,
                          preferredWorkModes: toggleString(current.preferredWorkModes, mode)
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{formatDomain(mode)}</span>
                  </label>
                ))}
              </div>

              <div className="toggle-group" aria-label="Employment types">
                {employmentTypes.map((type) => (
                  <label key={type}>
                    <input
                      checked={profileForm.seeksEmploymentTypes.includes(type)}
                      onChange={() =>
                        setProfileForm((current) => ({
                          ...current,
                          seeksEmploymentTypes: toggleString(current.seeksEmploymentTypes, type)
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{formatDomain(type)}</span>
                  </label>
                ))}
              </div>
              <div className="toggle-group" aria-label="International roles">
                <label>
                  <input
                    checked={profileForm.includeInternationalRoles}
                    onChange={() =>
                      setProfileForm((current) => ({ ...current, includeInternationalRoles: !current.includeInternationalRoles }))
                    }
                    type="checkbox"
                  />
                  <span>Include international roles</span>
                </label>
              </div>
            </form>
          </section>
        )}

        {selectedProfile !== null && workspaceView === "SOURCES" && (
          <section className="resume-panel">
            <div className="resume-card-main">
              <div className="resume-current">
                <div className="company-icon">
                  <FileText size={18} aria-hidden="true" />
                </div>
                <div>
                  <span>Current resume for {selectedProfile.name}</span>
                  <strong>{activeResume?.originalFilename ?? "No resume uploaded"}</strong>
                  {activeResume !== null ? (
                    <small>
                      {formatFileSize(activeResume.sizeBytes)} · {formatDomain(activeResume.extractionStatus)} · Uploaded{" "}
                      {formatDate(activeResume.createdAt)}
                    </small>
                  ) : (
                    <small>Upload a PDF to make this profile resume-aware.</small>
                  )}
                </div>
              </div>
              <p className="resume-help">
                Uploading a new PDF replaces the current resume for this profile only. Other profiles keep their own
                resumes.
              </p>
            </div>
            <form className="resume-form" onSubmit={(event) => void handleCreateResume(event)}>
              <label className="file-picker">
                <input
                  accept="application/pdf,.pdf"
                  aria-label="Choose resume PDF"
                  onChange={(event) => setSelectedResumeFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
                <span>{selectedResumeFile?.name ?? "Choose PDF"}</span>
              </label>
              <button className={activeResume === null ? "primary-button" : "secondary-button"} disabled={isLoading} type="submit">
                <UploadCloud size={15} aria-hidden="true" />
                {activeResume === null ? "Upload resume" : "Replace resume"}
              </button>
            </form>
            {activeResume === null && (
              <div className="source-guidance">
                <strong>Upload a resume to improve this profile.</strong>
                <span>RoleRadar will extract skills and suggest profile updates without storing the PDF locally.</span>
              </div>
            )}
            {resumes.length > 0 && (
              <div className="resume-history">
                <div className="resume-history-heading">
                  <span>Resume history</span>
                  <strong>{resumes.length}</strong>
                </div>
                {resumes.map((resume) => (
                  <div className={resume.isActive ? "resume-history-item active" : "resume-history-item"} key={resume.id}>
                    <div>
                      <strong>{resume.originalFilename}</strong>
                      <span>
                        {formatFileSize(resume.sizeBytes)} · {formatDomain(resume.extractionStatus)} ·{" "}
                        {formatDate(resume.createdAt)}
                      </span>
                    </div>
                    {resume.isActive ? (
                      <span className="active-pill">Current</span>
                    ) : (
                      <button
                        className="secondary-button compact-button"
                        disabled={isLoading}
                        onClick={() => void handleActivateResume(resume.id)}
                        type="button"
                      >
                        Use this
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {skillSuggestions.length > 0 && (
              <div className="suggestion-row">
                <div className="reason-list">
                  {skillSuggestions.slice(0, 8).map((suggestion) => (
                    <span key={suggestion.skill}>{suggestion.skill}</span>
                  ))}
                </div>
                <button className="secondary-button" disabled={isLoading} onClick={() => void applySuggestedSkills()} type="button">
                  Apply skills
                </button>
              </div>
            )}
            {targetSuggestions.roles.length > 0 && (
              <div className="suggestion-row">
                <div className="reason-list role-suggestions">
                  {targetSuggestions.roles.slice(0, 5).map((suggestion) => (
                    <span key={suggestion.role}>{suggestion.role}</span>
                  ))}
                  {targetSuggestions.domains[0] !== undefined && (
                    <span>{formatDomain(targetSuggestions.domains[0].domain)}</span>
                  )}
                </div>
                <button className="secondary-button" disabled={isLoading} onClick={() => void applySuggestedTargets()} type="button">
                  Apply roles
                </button>
              </div>
            )}
          </section>
        )}

        {selectedProfile !== null && workspaceView === "SOURCES" && (
          <section className="watch-panel">
            <div className="discovery-callout">
              <div>
                <p className="eyebrow">Platform discovery</p>
                <h3>Update the shared jobs catalog</h3>
                <p>
                  Scans active Greenhouse, Lever, Ashby, Workday, and career-page sources once. Jobs enter the shared
                  catalog, then RoleRadar applies this profile's role, domain, experience, and location rules.
                </p>
              </div>
              <button className="primary-button" disabled={isLoading} onClick={() => void handleDiscoverProfileJobs()} type="button">
                <Radar size={15} aria-hidden="true" />
                Scan job sources
              </button>
            </div>

            {lastDiscoverySummary !== null && (
              <div className="check-summary discovery-summary" role="status">
                <div>
                  <CheckCircle2 size={17} aria-hidden="true" />
                  <span>
                    Checked {lastDiscoverySummary.checked} source{lastDiscoverySummary.checked === 1 ? "" : "s"}.
                    {" "}
                    {lastDiscoverySummary.created} new and {lastDiscoverySummary.updated} updated match
                    {lastDiscoverySummary.created + lastDiscoverySummary.updated === 1 ? "" : "s"}.
                    {" "}
                    {lastDiscoverySummary.globallyCreated} new posting
                    {lastDiscoverySummary.globallyCreated === 1 ? "" : "s"} added globally; {lastDiscoverySummary.skippedIneligible} did not match this profile.
                    {lastDiscoverySummary.failed === 0 ? "" : ` ${lastDiscoverySummary.failed} failed.`}
                  </span>
                </div>
                <div className="source-result-list">
                  {lastDiscoverySummary.sources.map((source) => (
                    <span className={source.failed ? "source-result source-result-failed" : "source-result"} key={source.sourceId}>
                      {source.companyName}: {source.stored} matched · {source.normalized}/{source.fetched} ingested
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="section-heading">
              <div>
                <p className="eyebrow">Companies</p>
                <h3>Career pages to monitor</h3>
              </div>
              <div className="section-actions">
                <span className="count-pill">{companyWatches.length}</span>
                <button
                  className="primary-button"
                  disabled={isLoading || companyWatches.length === 0}
                  onClick={() => void handleCheckCompanyWatches()}
                  type="button"
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  Check now
                </button>
              </div>
            </div>

            <form className="watch-form" onSubmit={(event) => void handleCreateCompanyWatch(event)}>
              <input
                aria-label="Company name"
                placeholder="Company"
                value={companyWatchForm.companyName}
                onChange={(event) => setCompanyWatchForm((current) => ({ ...current, companyName: event.target.value }))}
              />
              <input
                aria-label="Careers URL"
                placeholder="Careers URL"
                value={companyWatchForm.careersUrl}
                onChange={(event) => setCompanyWatchForm((current) => ({ ...current, careersUrl: event.target.value }))}
              />
              <input
                aria-label="Website URL"
                placeholder="Website URL"
                value={companyWatchForm.websiteUrl}
                onChange={(event) => setCompanyWatchForm((current) => ({ ...current, websiteUrl: event.target.value }))}
              />
              <input
                aria-label="Check cadence days"
                min="1"
                max="30"
                type="number"
                value={companyWatchForm.checkCadenceDays}
                onChange={(event) =>
                  setCompanyWatchForm((current) => ({ ...current, checkCadenceDays: event.target.value }))
                }
              />
              <button className="secondary-button" disabled={isLoading} type="submit">
                Add
              </button>
            </form>

            <div className="csv-import-row">
              <label className="file-picker">
                <input
                  accept=".csv,text/csv"
                  aria-label="Choose company CSV"
                  onChange={(event) => setSelectedCompanyCsv(event.target.files?.[0] ?? null)}
                  type="file"
                />
                <span>{selectedCompanyCsv?.name ?? "Choose CSV"}</span>
              </label>
              <button
                className="secondary-button"
                disabled={isLoading || selectedCompanyCsv === null}
                onClick={() => void handleImportCompanyCsv()}
                type="button"
              >
                <UploadCloud size={15} aria-hidden="true" />
                Import CSV
              </button>
            </div>

            {lastWatchCheckSummary !== null && (
              <div className="check-summary" role="status">
                <CheckCircle2 size={17} aria-hidden="true" />
                <span>
                  Checked {lastWatchCheckSummary.checked} portal{lastWatchCheckSummary.checked === 1 ? "" : "s"}.
                  {" "}
                  {lastWatchCheckSummary.created} new and {lastWatchCheckSummary.updated} updated job
                  {lastWatchCheckSummary.created + lastWatchCheckSummary.updated === 1 ? "" : "s"}.
                  {lastWatchCheckSummary.failed === 0 ? "" : ` ${lastWatchCheckSummary.failed} failed.`}
                </span>
              </div>
            )}

            {companyWatches.length === 0 ? (
              <div className="inline-empty">
                <Building2 size={18} aria-hidden="true" />
                <span>No companies added for this profile yet.</span>
              </div>
            ) : (
              <div className="watch-list">
                {companyWatches.map((watch) => (
                  <div className="watch-item" key={watch.id}>
                    <div>
                      <strong>{watch.companyName}</strong>
                      <a href={watch.careersUrl} rel="noreferrer" target="_blank">
                        {watch.careersUrl}
                      </a>
                      <small>
                        <Clock3 size={12} aria-hidden="true" />
                        Every {watch.checkCadenceDays} day{watch.checkCadenceDays === 1 ? "" : "s"}
                        {watch.lastCheckedAt === undefined ? "" : ` · Checked ${formatDate(watch.lastCheckedAt)}`}
                        {(watch.consecutiveFailures ?? 0) === 0
                          ? ""
                          : ` · ${watch.consecutiveFailures} failed check${watch.consecutiveFailures === 1 ? "" : "s"}`}
                      </small>
                      {watch.lastError !== undefined && <small className="watch-error">{watch.lastError}</small>}
                    </div>
                    <button
                      className="icon-button"
                      disabled={isLoading}
                      onClick={() => void handleDeleteCompanyWatch(watch.id)}
                      title="Remove company"
                      type="button"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {workspaceView === "JOBS" && (
          <>
            <section className="tabs" aria-label="Recommendation views">
              {tabs.map((tab) => (
                <button
                  className={activeTab === tab ? "tab-button active" : "tab-button"}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {formatDomain(tab)}
                </button>
              ))}
            </section>

            <section className="filter-bar" aria-label="Job filters">
              <div className="filter-title">
                <SlidersHorizontal size={16} aria-hidden="true" />
                <span>{filteredDisplayItems.length} jobs</span>
              </div>
              <label>
                Location
                <input
                  value={jobFilters.location}
                  onChange={(event) => setJobFilters((current) => ({ ...current, location: event.target.value }))}
                />
              </label>
              <label>
                Domain
                <select
                  value={jobFilters.domain}
                  onChange={(event) => setJobFilters((current) => ({ ...current, domain: event.target.value }))}
                >
                  <option value="">Any</option>
                  {profileDomains.map((domain) => (
                    <option key={domain} value={domain}>
                      {formatDomain(domain)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Work mode
                <select
                  value={jobFilters.workMode}
                  onChange={(event) => setJobFilters((current) => ({ ...current, workMode: event.target.value }))}
                >
                  <option value="">Any</option>
                  {workModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {formatDomain(mode)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Company type
                <select
                  value={jobFilters.companyType}
                  onChange={(event) => setJobFilters((current) => ({ ...current, companyType: event.target.value }))}
                >
                  <option value="">Any</option>
                  <option value="STARTUP">Funded startups</option>
                  <option value="ESTABLISHED">Established companies</option>
                </select>
              </label>
              <label>
                Seniority
                <select
                  value={jobFilters.seniority}
                  onChange={(event) => setJobFilters((current) => ({ ...current, seniority: event.target.value }))}
                >
                  <option value="">Any</option>
                  {seniorityFilters.map((seniority) => (
                    <option key={seniority} value={seniority}>
                      {formatDomain(seniority)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="secondary-button"
                onClick={() => setJobFilters({ domain: "", location: "", seniority: "", workMode: "", companyType: "" })}
                type="button"
              >
                Clear
              </button>
            </section>
          </>
        )}

        {error !== null && <div className="error-banner">{error}</div>}

        {workspaceView === "JOBS" ? (
          <section className="recommendation-list">
            {isLoading && <div className="loading-row">Updating matches...</div>}
            {filteredDisplayItems.length === 0 && !isLoading && (
              <section className="empty-state compact-empty">
                <Search size={28} aria-hidden="true" />
                <h3>No jobs match these filters.</h3>
                <p>Try clearing a filter or widening the profile locations.</p>
              </section>
            )}
            {filteredDisplayItems.slice(0, visibleLimit).map((item) => {
              const recommendation = item.kind === "recommendation" ? item.recommendation : null;
              const job = item.kind === "recommendation" ? item.recommendation.job : item.stateRecord.job;
              const state = item.kind === "recommendation" ? item.recommendation.state : item.stateRecord.state;

              return (
              <article className="job-card" key={`${activeTab}-${job.id}`}>
                <div className="job-card-main">
                  <div className="company-icon">
                    <BriefcaseBusiness size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="job-heading">
                      <h3>{job.title}</h3>
                      {recommendation !== null && <span className="score-badge">{recommendation.score}</span>}
                    </div>
                    <p>
                      {job.companyName} · {job.locations.join(", ") || "Location unknown"} · {formatDomainList(job.domains)}
                    </p>
                  </div>
                </div>

                <div className="job-meta">
                  {job.companyStage === "STARTUP" && <span>Startup</span>}
                  <span>{formatDomain(job.seniority)}</span>
                  <span>{formatDomain(job.workMode)}</span>
                  {recommendation !== null && <span>{formatDomain(recommendation.eligibility)}</span>}
                  {state !== undefined && <span>{formatDomain(state)}</span>}
                </div>

                {job.description.trim().length > 0 && <p className="job-description">{truncateJobDescription(job.description)}</p>}

                {recommendation !== null && (
                  <div className="reason-list">
                    {recommendation.reasons.slice(0, 3).map((reason) => (
                      <span key={reason}>{formatRecommendationReason(reason)}</span>
                    ))}
                  </div>
                )}

                {item.kind === "state" && item.stateRecord.state === "APPLIED" && (
                  <div className="application-tracker">
                    <div className="application-tracker-fields">
                      <label>
                        Stage
                        <select
                          value={applicationDrafts[job.id]?.applicationStage ?? item.stateRecord.applicationStage ?? "APPLIED"}
                          onChange={(event) =>
                            setApplicationDrafts((currentDrafts) => ({
                              ...currentDrafts,
                              [job.id]: {
                                applicationStage: event.target.value as ApplicationStage,
                                applicationNotes: currentDrafts[job.id]?.applicationNotes ?? item.stateRecord.applicationNotes ?? ""
                              }
                            }))
                          }
                        >
                          {applicationStages.map((stage) => (
                            <option key={stage} value={stage}>
                              {formatDomain(stage)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Notes
                        <input
                          placeholder="Recruiter follow-up, referral, interview date..."
                          value={applicationDrafts[job.id]?.applicationNotes ?? item.stateRecord.applicationNotes ?? ""}
                          onChange={(event) =>
                            setApplicationDrafts((currentDrafts) => ({
                              ...currentDrafts,
                              [job.id]: {
                                applicationStage: currentDrafts[job.id]?.applicationStage ?? item.stateRecord.applicationStage ?? "APPLIED",
                                applicationNotes: event.target.value
                              }
                            }))
                          }
                        />
                      </label>
                    </div>
                    <div className="application-tracker-actions">
                      <span>{item.stateRecord.appliedAt === undefined ? "Applied date not set" : `Applied ${formatDate(item.stateRecord.appliedAt)}`}</span>
                      <button
                        className="secondary-button compact-button"
                        disabled={isLoading}
                        onClick={() => void saveApplicationTracking(job.id)}
                        type="button"
                      >
                        Save tracking
                      </button>
                    </div>
                  </div>
                )}

                <div className="job-actions">
                  <button
                    className="secondary-button"
                    disabled={isLoading}
                    onClick={() => void updateJobState(job.id, "SAVED")}
                    type="button"
                  >
                    <Bookmark size={15} aria-hidden="true" />
                    Save
                  </button>
                  <button
                    className="secondary-button"
                    disabled={isLoading}
                    onClick={() => void updateJobState(job.id, "APPLIED")}
                    type="button"
                  >
                    <CheckCircle2 size={15} aria-hidden="true" />
                    Applied
                  </button>
                  <button
                    className="secondary-button"
                    disabled={isLoading}
                    onClick={() => void updateJobState(job.id, "HIDDEN")}
                    type="button"
                  >
                    <EyeOff size={15} aria-hidden="true" />
                    Hide
                  </button>
                  {state !== undefined && (
                    <button
                      className="secondary-button"
                      disabled={isLoading}
                      onClick={() => void resetJobState(job.id)}
                      type="button"
                    >
                      <RotateCcw size={15} aria-hidden="true" />
                      Clear
                    </button>
                  )}
                  <a className="open-link" href={job.applyUrl} rel="noreferrer" target="_blank">
                    Open listing
                    <ExternalLink size={15} aria-hidden="true" />
                  </a>
                </div>
              </article>
              );
            })}
            {filteredDisplayItems.length > visibleLimit && (
              <button
                className="secondary-button"
                onClick={() => setVisibleLimit((current) => current + 50)}
                type="button"
              >
                Show more ({filteredDisplayItems.length - visibleLimit} remaining)
              </button>
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}

function formatDomain(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDomainList(values: string[]): string {
  return values.map(formatDomain).join(", ");
}

function formatRecommendationReason(reason: string): string {
  return reason.replace(/\b[A-Z]+(?:_[A-Z]+)+\b/g, (value) => formatDomain(value));
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium"
  }).format(new Date(value));
}

function truncateJobDescription(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= 280 ? normalized : `${normalized.slice(0, 277).trimEnd()}...`;
}

function getDisplayJob(item: DisplayItem): Job {
  return item.kind === "recommendation" ? item.recommendation.job : item.stateRecord.job;
}

function matchesJobFilters(job: Job, filters: JobFilters): boolean {
  const locationFilter = filters.location.trim().toLowerCase();
  const matchesLocation =
    locationFilter.length === 0 ||
    job.locations.some((location) => location.toLowerCase().includes(locationFilter)) ||
    (job.workMode === "REMOTE" && "remote".includes(locationFilter));

  return (
    matchesLocation &&
    (filters.domain.length === 0 || job.domains.includes(filters.domain)) &&
    (filters.seniority.length === 0 || job.seniority === filters.seniority) &&
    (filters.workMode.length === 0 || job.workMode === filters.workMode) &&
    (filters.companyType.length === 0 ||
      (filters.companyType === "STARTUP" ? job.companyStage === "STARTUP" : job.companyStage !== "STARTUP"))
  );
}

function toProfileFormState(profile: CareerProfile): ProfileFormState {
  return {
    domain: profile.domain,
    experienceMonths: String(profile.experienceMonths),
    graduationYear: profile.graduationYear === undefined ? "" : String(profile.graduationYear),
    preferredRoles: profile.preferredRoles.join(", "),
    preferredLocations: profile.preferredLocations.join(", "),
    preferredWorkModes: profile.preferredWorkModes,
    citizenshipCountry: profile.citizenshipCountry ?? "India",
    includeInternationalRoles: profile.includeInternationalRoles ?? false,
    skills: profile.skills.join(", "),
    seeksEmploymentTypes: profile.seeksEmploymentTypes
  };
}

function buildProfileInput(form: ProfileFormState, fallbackName: string): CreateProfileInput {
  const graduationYear = parseOptionalNumber(form.graduationYear, "Graduation year");
  const input: CreateProfileInput = {
    name: fallbackName,
    domain: form.domain,
    experienceMonths: parseRequiredNumber(form.experienceMonths, "Experience"),
    preferredRoles: splitCsv(form.preferredRoles),
    preferredLocations: splitCsv(form.preferredLocations),
    preferredWorkModes: form.preferredWorkModes.length === 0 ? ["REMOTE", "HYBRID"] : form.preferredWorkModes,
    citizenshipCountry: form.citizenshipCountry.trim() || "India",
    includeInternationalRoles: form.includeInternationalRoles,
    targetCompanies: [],
    excludedCompanies: [],
    includedKeywords: [],
    excludedKeywords: [],
    skills: splitCsv(form.skills),
    seeksEmploymentTypes: form.seeksEmploymentTypes.length === 0 ? ["FULL_TIME"] : form.seeksEmploymentTypes
  };

  if (graduationYear !== undefined) {
    input.graduationYear = graduationYear;
  }

  return input;
}

function mergeStrings(existingValues: string[], newValues: string[]): string[] {
  const normalizedExistingValues = new Set(existingValues.map((value) => value.toLowerCase()));
  const mergedValues = [...existingValues];

  for (const value of newValues) {
    if (!normalizedExistingValues.has(value.toLowerCase())) {
      mergedValues.push(value);
      normalizedExistingValues.add(value.toLowerCase());
    }
  }

  return mergedValues;
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toggleString(values: string[], value: string): string[] {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }

  return [...values, value];
}

function parseRequiredNumber(value: string, fieldName: string): number {
  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }

  return parsedValue;
}

function parseOptionalNumber(value: string, fieldName: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue)) {
    throw new Error(`${fieldName} must be an integer`);
  }

  return parsedValue;
}

function parseCompanyWatchCsv(csvText: string): CreateCompanyWatchInput[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    throw new Error("CSV must include a header row and at least one company");
  }

  const headers = rows[0]?.map(normalizeCsvHeader) ?? [];
  const companyIndex = findCsvColumn(headers, ["companyname", "company", "name"]);
  const careersIndex = findCsvColumn(headers, ["careersurl", "careerurl", "careerspage", "careerpage", "jobsurl", "url"]);
  const websiteIndex = findCsvColumn(headers, ["websiteurl", "website", "site"]);
  const cadenceIndex = findCsvColumn(headers, ["checkcadencedays", "cadencedays", "cadence", "days"]);

  if (companyIndex === -1 || careersIndex === -1) {
    throw new Error("CSV must include companyName and careersUrl columns");
  }

  return rows.slice(1).flatMap((row) => {
    const companyName = row[companyIndex]?.trim() ?? "";
    const careersUrl = row[careersIndex]?.trim() ?? "";
    const websiteUrl = websiteIndex === -1 ? "" : row[websiteIndex]?.trim() ?? "";
    const cadenceValue = cadenceIndex === -1 ? "1" : row[cadenceIndex]?.trim() || "1";

    if (companyName.length === 0 && careersUrl.length === 0) {
      return [];
    }

    if (companyName.length === 0 || careersUrl.length === 0) {
      throw new Error("Every imported company needs both companyName and careersUrl");
    }

    return [
      {
        companyName,
        careersUrl,
        ...(websiteUrl.length === 0 ? {} : { websiteUrl }),
        checkCadenceDays: parseRequiredNumber(cadenceValue, "Check cadence")
      }
    ];
  });
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let isQuoted = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const nextCharacter = csvText[index + 1];

    if (character === "\"" && isQuoted && nextCharacter === "\"") {
      currentCell += "\"";
      index += 1;
    } else if (character === "\"") {
      isQuoted = !isQuoted;
    } else if (character === "," && !isQuoted) {
      currentRow.push(currentCell);
      currentCell = "";
    } else if ((character === "\n" || character === "\r") && !isQuoted) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      if (currentRow.some((cell) => cell.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += character;
    }
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.trim().length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function normalizeCsvHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function findCsvColumn(headers: string[], candidates: string[]): number {
  return headers.findIndex((header) => candidates.includes(header));
}
