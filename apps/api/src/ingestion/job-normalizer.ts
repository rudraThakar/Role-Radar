import {
  classifyJobDomain,
  employmentTypes,
  seniorityLevels,
  workModes,
  type EmploymentType,
  type ProfileDomain,
  type Seniority,
  type WorkMode
} from "@roleradar/domain";

import type { CreateJobInput } from "../jobs/job.dto.js";
import type { RawJobPostingInput } from "./ingestion.dto.js";

export function normalizeRawJobPosting(rawJob: RawJobPostingInput): CreateJobInput {
  const sourceText = `${rawJob.title} ${rawJob.description}`;
  const searchableText = normalizeText(sourceText);
  const skills = rawJob.skills ?? inferSkills(searchableText);
  const classification = classifyJobDomain({
    title: rawJob.title,
    description: rawJob.description,
    skills
  });
  const experience = inferExperienceRange(sourceText);

  const input: CreateJobInput = {
    companyName: rawJob.companyName,
    title: rawJob.title,
    normalizedTitle: normalizeTitle(rawJob.title),
    description: rawJob.description,
    employmentType: inferEmploymentType(searchableText),
    seniority: inferSeniority(rawJob.title, searchableText, experience),
    // Unknown postings must not be mislabeled as software. They cannot pass a
    // strict profile-domain match until the classifier has positive evidence.
    domains: classification.domains,
    skills,
    locations: rawJob.locations ?? inferLocations(rawJob.description),
    workMode: inferWorkMode(searchableText),
    sourceUrl: rawJob.sourceUrl,
    applyUrl: rawJob.applyUrl ?? rawJob.sourceUrl,
    discoveredAt: new Date()
  };

  if (experience.minimumMonths !== undefined) input.minimumExperienceMonths = experience.minimumMonths;
  if (experience.maximumMonths !== undefined) input.maximumExperienceMonths = experience.maximumMonths;
  if (rawJob.publishedAt !== undefined) input.publishedAt = rawJob.publishedAt;

  return input;
}

function inferEmploymentType(text: string): EmploymentType {
  if (text.includes("intern")) return "INTERNSHIP";
  if (text.includes("contract")) return "CONTRACT";
  if (text.includes("part time") || text.includes("part-time")) return "PART_TIME";
  return employmentTypes.includes("FULL_TIME") ? "FULL_TIME" : "UNKNOWN";
}

function inferSeniority(title: string, text: string, experience: ExperienceRange): Seniority {
  const normalizedTitle = normalizeText(title);

  // Title signals are stronger than incidental wording in a description such
  // as "work with senior engineers" or "mentor junior engineers".
  if (
    /\b(senior|sr|staff|principal|lead|manager|director|head of|architect|distinguished|fellow|vp|vice president)\b/.test(
      normalizedTitle
    )
  ) {
    return "SENIOR";
  }
  if (/\b(iii|iv|v|3|4|5)$/.test(normalizedTitle) && /\b(engineer|developer|sde|designer|analyst|scientist)\b/.test(normalizedTitle)) {
    return "SENIOR";
  }
  if (/\b(ii|2)$/.test(normalizedTitle) && /\b(engineer|developer|sde|designer|analyst|scientist)\b/.test(normalizedTitle)) {
    return "MID_LEVEL";
  }
  if (/\b(fresher|new grad|new graduate|graduate|campus|university|intern|trainee)\b/.test(normalizedTitle)) return "FRESHER";
  if (/\b(entry level|junior|jr|associate|early career)\b/.test(normalizedTitle)) return "ENTRY_LEVEL";

  if (experience.minimumMonths === 0) return "ENTRY_LEVEL";
  if (experience.minimumMonths !== undefined && experience.minimumMonths >= 60) return "SENIOR";
  if (experience.minimumMonths !== undefined && experience.minimumMonths >= 24) return "MID_LEVEL";
  if (experience.minimumMonths !== undefined) return "ENTRY_LEVEL";
  if (/\b(fresher|new grad|new graduate|entry level|entry-level|early career)\b/.test(text)) return "FRESHER";
  // No evidence either way: do not invent a level.
  return seniorityLevels.includes("UNKNOWN") ? "UNKNOWN" : "MID_LEVEL";
}

interface ExperienceRange {
  minimumMonths?: number;
  maximumMonths?: number;
}

const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
  fifteen: 15
};
const numberToken = `\\d+(?:\\.\\d+)?|${Object.keys(numberWords).join("|")}`;
const durationPattern = new RegExp(
  `(?<![\\w.])(${numberToken})\\s*(?:\\+|\\(\\+\\)|or more|or above)?\\s*(?:(?:-|–|—|to)\\s*(${numberToken})\\s*\\+?\\s*)?(years?|yrs?|months?)\\b`,
  "g"
);
const experienceContext = /\b(experience|experienced|exp|expertise|background|track record|hands[ -]on|proven|working|worked|professional|industry)\b/;
const nonRequirementContext = /\b(founded|since|anniversary|history|ago|old|in business|of innovation|of growth|of excellence|of leadership|warranty|lifespan|contract|term|tenure|bond|probation)\b/;
const nonRequirementPrefix = /\b(within|in the (?:next|last|past)|over the (?:next|last|past)|last|past|next|first|every|after|than|under|less than)\s*$/;
const optionalSectionMarker = /\b(preferred|nice to have|good to have|bonus|desirable|ideally|a plus|is a plus|would be a plus)\b/;

export function inferExperienceRange(sourceText: string): ExperienceRange {
  const text = sourceText.toLowerCase().replace(/\s+/g, " ");
  const optionalIndex = text.search(optionalSectionMarker);
  // Anything after "preferred qualifications" is not a hard requirement.
  const requiredText = optionalIndex > 200 ? text.slice(0, optionalIndex) : text;

  let minimumMonths: number | undefined;
  let maximumMonths: number | undefined;

  for (const match of requiredText.matchAll(durationPattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const before = requiredText.slice(Math.max(0, start - 80), start);
    const after = requiredText.slice(end, end + 80);
    const around = `${before} ${match[0]} ${after}`;

    if (nonRequirementPrefix.test(before.slice(-25)) || nonRequirementContext.test(around)) continue;
    if (!experienceContext.test(around)) continue;

    const unitMonths = match[3]?.startsWith("m") === true ? 1 : 12;
    const low = parseNumber(match[1]);
    const high = parseNumber(match[2]);
    if (low === undefined) continue;

    const lowMonths = Math.round(low * unitMonths);
    if (minimumMonths === undefined || lowMonths > minimumMonths) {
      minimumMonths = lowMonths;
      maximumMonths = high === undefined ? undefined : Math.round(high * unitMonths);
    }
  }

  if (minimumMonths !== undefined) {
    return maximumMonths === undefined ? { minimumMonths } : { minimumMonths, maximumMonths };
  }

  if (/\b(fresher|freshers|new grad|new graduate|entry[ -]level|no experience|no prior experience|zero experience|required experience:\s*none|0\s*(?:-|to)\s*\d+\s*(?:years?|yrs?))\b/.test(text)) {
    return { minimumMonths: 0 };
  }

  return {};
}

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const asNumber = Number(value);
  if (Number.isFinite(asNumber)) return asNumber;
  return numberWords[value];
}

function inferWorkMode(text: string): WorkMode {
  if (text.includes("remote")) return "REMOTE";
  if (text.includes("hybrid")) return "HYBRID";
  if (text.includes("onsite") || text.includes("on-site") || text.includes("office")) return "ONSITE";
  return workModes.includes("UNKNOWN") ? "UNKNOWN" : "ONSITE";
}

function inferLocations(text: string): string[] {
  const knownLocations = [
    "Bengaluru",
    "Hyderabad",
    "Pune",
    "Chennai",
    "Gurugram",
    "Noida",
    "Mumbai",
    "Ahmedabad",
    "Kochi",
    "Kolkata",
    "Jaipur",
    "Remote",
    "USA",
    "United States"
  ];
  const normalizedText = normalizeText(text);
  return knownLocations.filter((location) => normalizedText.includes(normalizeText(location)));
}

function inferSkills(text: string): string[] {
  const skillSignals: Record<string, string[]> = {
    "C++": ["c++", "cpp"],
    TypeScript: ["typescript"],
    JavaScript: ["javascript"],
    "Node.js": ["node.js", "nodejs", "node"],
    PostgreSQL: ["postgresql", "postgres"],
    Python: ["python"],
    Java: ["java"],
    Go: ["go", "golang"],
    Kubernetes: ["kubernetes", "k8s"],
    Docker: ["docker"],
    Verilog: ["verilog"],
    SystemVerilog: ["systemverilog", "system verilog"],
    Firmware: ["firmware"],
    RTL: ["rtl"],
    CAD: ["cad"],
    SolidWorks: ["solidworks"],
    CATIA: ["catia"],
    Creo: ["creo"],
    FEA: ["finite element", "fea"],
    HVAC: ["hvac"],
    AutoCAD: ["autocad"],
    Revit: ["revit"],
    BIM: ["building information modeling", "bim"]
  };

  return Object.entries(skillSignals)
    .filter(([, aliases]) => aliases.some((alias) => text.includes(normalizeText(alias))))
    .map(([skill]) => skill);
}

function normalizeTitle(title: string): string {
  return normalizeText(title);
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
