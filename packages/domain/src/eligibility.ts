import type { CanonicalJob } from "./job.js";
import type { CareerProfile } from "./profile.js";
import type { Eligibility } from "./recommendation.js";
import { countMatches, hasAnyTextMatch, normalizeText } from "./text.js";

export interface EligibilityResult {
  eligibility: Eligibility;
  reasons: string[];
  gaps: string[];
  evidence: Record<string, unknown>;
}

export function evaluateEligibility(job: CanonicalJob, profile: CareerProfile): EligibilityResult {
  const reasons: string[] = [];
  const gaps: string[] = [];
  const evidence: Record<string, unknown> = {};

  if (profile.excludedCompanies.map(normalizeText).includes(normalizeText(job.companyName))) {
    return ineligible("Company is excluded by this profile", { companyName: job.companyName });
  }

  const jobText = `${job.title} ${job.description}`;
  if (hasAnyTextMatch(jobText, profile.excludedKeywords)) {
    return ineligible("Job contains an excluded keyword", { excludedKeywords: profile.excludedKeywords });
  }

  if (job.minimumExperienceMonths !== undefined && job.minimumExperienceMonths > profile.experienceMonths) {
    return ineligible("Required experience is greater than this profile's experience", {
      requiredExperienceMonths: job.minimumExperienceMonths,
      profileExperienceMonths: profile.experienceMonths
    });
  }

  if (job.seniority === "SENIOR" && profile.experienceMonths < 48) {
    return ineligible("Role title indicates a senior-level position", {
      jobSeniority: job.seniority,
      profileExperienceMonths: profile.experienceMonths
    });
  }

  if (
    job.minimumExperienceMonths === undefined &&
    job.seniority === "MID_LEVEL" &&
    profile.experienceMonths < 12
  ) {
    return ineligible("Role is mid-level and this profile has under a year of experience", {
      jobSeniority: job.seniority,
      profileExperienceMonths: profile.experienceMonths
    });
  }

  if (job.minimumExperienceMonths === undefined && job.seniority === "UNKNOWN") {
    gaps.push("Posting does not state an experience requirement");
  }

  if (job.minimumExperienceMonths !== undefined) {
    reasons.push(`Experience requirement (${formatExperience(job.minimumExperienceMonths)}) fits this profile`);
  }

  if (
    job.eligibleGraduationYears !== undefined &&
    profile.graduationYear !== undefined &&
    !job.eligibleGraduationYears.includes(profile.graduationYear)
  ) {
    return ineligible("Profile graduation year is not listed as eligible", {
      eligibleGraduationYears: job.eligibleGraduationYears,
      profileGraduationYear: profile.graduationYear
    });
  }

  if (
    job.employmentType !== "UNKNOWN" &&
    profile.seeksEmploymentTypes.length > 0 &&
    !profile.seeksEmploymentTypes.includes(job.employmentType)
  ) {
    return ineligible("Employment type does not match this profile", {
      jobEmploymentType: job.employmentType,
      profileEmploymentTypes: profile.seeksEmploymentTypes
    });
  }

  if (
    job.workMode !== "UNKNOWN" &&
    profile.preferredWorkModes.length > 0 &&
    !profile.preferredWorkModes.includes(job.workMode)
  ) {
    return ineligible("Work mode does not match this profile", {
      jobWorkMode: job.workMode,
      profileWorkModes: profile.preferredWorkModes
    });
  }

  if (!profile.includeInternationalRoles) {
    const homeCountry = profile.citizenshipCountry ?? "India";
    const authorization = assessWorkAuthorization(job, homeCountry);
    if (authorization !== "OK") {
      return ineligible(
        authorization === "UNSTATED"
          ? "Job location is not stated, so it cannot be confirmed as open to this profile's country"
          : "Job is outside this profile's default work-authorization country",
        { jobLocations: job.locations, citizenshipCountry: homeCountry }
      );
    }
  }

  if (job.salaryMin !== undefined && profile.minimumSalary !== undefined && job.salaryMin < profile.minimumSalary) {
    return ineligible("Known salary is below this profile's minimum", {
      jobSalaryMin: job.salaryMin,
      profileMinimumSalary: profile.minimumSalary
    });
  }

  if (job.domains.includes(profile.domain)) {
    reasons.push(`Job domain matches ${profile.domain}`);
  } else if (job.domains.length > 0 && profile.domain !== "GENERAL") {
    gaps.push(`Job is classified as ${job.domains.join(", ")}, not ${profile.domain}`);
  }

  const matchingSkills = countMatches(profile.skills, job.skills);
  evidence.matchingSkills = matchingSkills;
  if (matchingSkills > 0) {
    reasons.push(`${matchingSkills} required skill(s) match this profile`);
  } else if (job.skills.length > 0) {
    gaps.push("No extracted job skills match this profile yet");
  }

  const locationMatches = countLocationMatches(profile.preferredLocations, job.locations);
  evidence.locationMatches = locationMatches;
  if (job.workMode === "REMOTE" || locationMatches > 0) {
    reasons.push("Location or remote preference matches");
  } else if (profile.preferredLocations.length > 0 && job.locations.length > 0) {
    return ineligible("Job location is outside this profile's preferred locations", {
      jobLocations: job.locations,
      preferredLocations: profile.preferredLocations
    });
  }

  if (job.minimumExperienceMonths === 0 || job.seniority === "FRESHER" || job.seniority === "ENTRY_LEVEL") {
    reasons.push("Role appears suitable for fresher or entry-level candidates");
  }

  if (reasons.length === 0 && gaps.length === 0) {
    return {
      eligibility: "UNKNOWN",
      reasons: ["Not enough reliable information to decide eligibility"],
      gaps,
      evidence
    };
  }

  return {
    eligibility: gaps.length > 0 ? "POSSIBLY_ELIGIBLE" : "ELIGIBLE",
    reasons,
    gaps,
    evidence
  };
}

function countLocationMatches(preferredLocations: string[], jobLocations: string[]): number {
  let matches = 0;

  for (const jobLocation of jobLocations) {
    const normalizedJobLocation = normalizeText(jobLocation);
    const matched = preferredLocations.some((preferredLocation) => {
      const normalizedPreferredLocation = normalizeText(preferredLocation);
      const preferredCountry = detectCountry(preferredLocation);
      const jobCountry = detectCountry(jobLocation);
      return (
        normalizedJobLocation === normalizedPreferredLocation ||
        normalizedJobLocation.includes(normalizedPreferredLocation) ||
        normalizedPreferredLocation.includes(normalizedJobLocation) ||
        (preferredCountry !== undefined && preferredCountry === jobCountry)
      );
    });

    if (matched) {
      matches += 1;
    }
  }

  return matches;
}

type WorkAuthorization = "OK" | "OUTSIDE" | "UNSTATED";

// A job is only shown when it positively belongs to the profile's country or
// is location-neutral remote. Unrecognised places are treated as outside, so a
// missing country list can never leak foreign jobs into the feed.
function assessWorkAuthorization(job: CanonicalJob, homeCountry: string): WorkAuthorization {
  const home = normalizeCountry(homeCountry);
  const locations = job.locations.map((location) => location.trim()).filter((location) => location.length > 0);

  if (locations.length === 0) {
    return job.workMode === "REMOTE" ? "OK" : "UNSTATED";
  }

  for (const location of locations) {
    const country = detectCountry(location);
    if (country === home) return "OK";
    if (country === undefined && normalizeText(location).includes(home)) return "OK";
    if (country === undefined && isLocationNeutral(location)) return "OK";
  }

  return "OUTSIDE";
}

function isLocationNeutral(location: string): boolean {
  return /^(?:remote|anywhere|worldwide|global|work from home|fully remote|distributed)(?:\s*[-,(]?\s*(?:anywhere|worldwide|global|distributed))?\)?$/.test(
    normalizeText(location)
  );
}

const countryPatterns: Array<[string, RegExp]> = [
  [
    "india",
    /\b(india|bengaluru|bangalore|hyderabad|pune|chennai|gurugram|gurgaon|noida|mumbai|navi mumbai|thane|ahmedabad|kochi|cochin|kolkata|jaipur|delhi|new delhi|ncr|chandigarh|mohali|thiruvananthapuram|trivandrum|indore|coimbatore|bhubaneswar|nagpur|vadodara|surat|lucknow|mysuru|mysore|visakhapatnam|gandhinagar|karnataka|maharashtra|telangana|tamil nadu|haryana|uttar pradesh|gujarat|kerala)\b/
  ],
  ["canada", /\b(canada|toronto|vancouver|ontario|montreal|ottawa|calgary|waterloo|british columbia|quebec)\b/],
  ["united kingdom", /\b(united kingdom|uk|london|england|scotland|wales|manchester|edinburgh|cambridge uk|bristol|belfast)\b/],
  ["germany", /\b(germany|berlin|munich|hamburg|frankfurt|cologne|stuttgart|dresden)\b/],
  ["hungary", /\b(hungary|budapest)\b/],
  ["poland", /\b(poland|warsaw|krakow|wroclaw|gdansk)\b/],
  ["israel", /\b(israel|tel aviv|haifa|jerusalem|herzliya)\b/],
  ["netherlands", /\b(netherlands|amsterdam|eindhoven|rotterdam|utrecht)\b/],
  ["ireland", /\b(ireland|dublin|cork|galway)\b/],
  ["france", /\b(france|paris|grenoble|lyon|toulouse)\b/],
  ["spain", /\b(spain|madrid|barcelona)\b/],
  ["portugal", /\b(portugal|lisbon|porto)\b/],
  ["italy", /\b(italy|milan|rome|turin)\b/],
  ["sweden", /\b(sweden|stockholm|gothenburg)\b/],
  ["denmark", /\b(denmark|copenhagen)\b/],
  ["norway", /\b(norway|oslo)\b/],
  ["finland", /\b(finland|helsinki)\b/],
  ["switzerland", /\b(switzerland|zurich|geneva|lausanne)\b/],
  ["austria", /\b(austria|vienna)\b/],
  ["belgium", /\b(belgium|brussels|leuven)\b/],
  ["czech republic", /\b(czech|prague|brno)\b/],
  ["romania", /\b(romania|bucharest)\b/],
  ["ukraine", /\b(ukraine|kyiv|kiev)\b/],
  ["turkey", /\b(turkey|istanbul)\b/],
  ["singapore", /\b(singapore)\b/],
  ["taiwan", /\b(taiwan|hsinchu|taipei)\b/],
  ["china", /\b(china|shanghai|beijing|shenzhen|hangzhou|guangzhou)\b/],
  ["hong kong", /\b(hong kong)\b/],
  ["south korea", /\b(south korea|korea|seoul)\b/],
  ["japan", /\b(japan|tokyo|osaka|yokohama)\b/],
  ["australia", /\b(australia|sydney|melbourne|brisbane|perth|canberra)\b/],
  ["new zealand", /\b(new zealand|auckland|wellington)\b/],
  ["united arab emirates", /\b(uae|united arab emirates|dubai|abu dhabi)\b/],
  ["saudi arabia", /\b(saudi|riyadh)\b/],
  ["brazil", /\b(brazil|sao paulo|rio de janeiro)\b/],
  ["mexico", /\b(mexico|mexico city|guadalajara|monterrey)\b/],
  ["argentina", /\b(argentina|buenos aires)\b/],
  ["colombia", /\b(colombia|bogota|medellin)\b/],
  ["chile", /\b(chile|santiago)\b/],
  ["south africa", /\b(south africa|cape town|johannesburg)\b/],
  ["nigeria", /\b(nigeria|lagos)\b/],
  ["kenya", /\b(kenya|nairobi)\b/],
  ["egypt", /\b(egypt|cairo)\b/],
  ["philippines", /\b(philippines|manila)\b/],
  ["vietnam", /\b(vietnam|ho chi minh|hanoi)\b/],
  ["indonesia", /\b(indonesia|jakarta)\b/],
  ["malaysia", /\b(malaysia|kuala lumpur)\b/],
  ["thailand", /\b(thailand|bangkok)\b/],
  ["pakistan", /\b(pakistan|karachi|lahore)\b/],
  ["bangladesh", /\b(bangladesh|dhaka)\b/],
  ["sri lanka", /\b(sri lanka|colombo)\b/],
  ["emea", /\b(emea|europe|european union|eu only)\b/],
  ["apac", /\b(apac|asia pacific|latam|latin america|north america|americas)\b/]
];

function detectCountry(location: string): string | undefined {
  const normalizedLocation = normalizeText(location);
  // "Remote - India" must resolve to India even though other tokens exist.
  for (const [country, pattern] of countryPatterns) {
    if (country === "india" && pattern.test(normalizedLocation)) return country;
  }
  if (/(?:^|,\s*)IN\s*$/.test(location.trim())) return "india";
  if (isUnitedStatesLocation(location, normalizedLocation)) {
    return "united states";
  }
  for (const [country, pattern] of countryPatterns) {
    if (pattern.test(normalizedLocation)) return country;
  }
  return undefined;
}

function isUnitedStatesLocation(location: string, normalizedLocation: string): boolean {
  if (
    /\b(us|usa|u s a|united states|us ca|us ny|us wa|california|new york|texas|massachusetts|washington state|illinois|virginia|north carolina|south carolina|colorado|georgia|florida|new jersey|pennsylvania|oregon|michigan|minnesota|arizona)\b/.test(
      normalizedLocation
    )
  ) {
    return true;
  }

  if (/\b(san francisco|santa clara|san jose|seattle|austin|boston|new york city|chicago|raleigh|mountain view|palo alto|portland|denver|atlanta)\b/.test(normalizedLocation)) {
    return true;
  }

  return /(?:^|,\s*)(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|IA|KS|KY|LA|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)(?:\s|$)/i.test(
    location.trim()
  );
}

function normalizeCountry(country: string): string {
  const normalized = normalizeText(country);
  if (normalized === "usa" || normalized === "us") return "united states";
  if (normalized === "uk") return "united kingdom";
  return normalized;
}

function ineligible(reason: string, evidence: Record<string, unknown>): EligibilityResult {
  return {
    eligibility: "INELIGIBLE",
    reasons: [],
    gaps: [reason],
    evidence
  };
}

function formatExperience(months: number): string {
  if (months === 0) return "no prior experience";
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${months} months`;
}
