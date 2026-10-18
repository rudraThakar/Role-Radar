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
  const experience = inferExperienceRange(sourceText.toLowerCase());

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
  if (/\b(senior|sr\.?|staff|principal|lead)\b/.test(normalizedTitle)) return "SENIOR";
  if (/\b(fresher|new grad|graduate)\b/.test(normalizedTitle)) return "FRESHER";
  if (/\b(entry level|junior|associate)\b/.test(normalizedTitle)) return "ENTRY_LEVEL";

  if (experience.minimumMonths === 0) return "ENTRY_LEVEL";
  if (experience.minimumMonths !== undefined && experience.minimumMonths >= 24) return "MID_LEVEL";
  if (/\b(senior|staff|principal)\b/.test(text)) return "SENIOR";
  if (/\b(fresher|new grad|graduate)\b/.test(text)) return "FRESHER";
  if (/\b(entry level|entry-level|junior)\b/.test(text)) return "ENTRY_LEVEL";
  return seniorityLevels.includes("MID_LEVEL") ? "MID_LEVEL" : "UNKNOWN";
}

interface ExperienceRange {
  minimumMonths?: number;
  maximumMonths?: number;
}

function inferExperienceRange(text: string): ExperienceRange {
  const yearRange = text.match(/\b(\d+)\s*(?:-|–|—|to)\s*(\d+)\+?\s*(?:years?|yrs?)\b/);
  if (yearRange?.[1] !== undefined && yearRange[2] !== undefined) {
    return {
      minimumMonths: Number(yearRange[1]) * 12,
      maximumMonths: Number(yearRange[2]) * 12
    };
  }

  const monthRange = text.match(/\b(\d+)\s*(?:-|–|—|to)\s*(\d+)\+?\s*months?\b/);
  if (monthRange?.[1] !== undefined && monthRange[2] !== undefined) {
    return {
      minimumMonths: Number(monthRange[1]),
      maximumMonths: Number(monthRange[2])
    };
  }

  const upperBound = text.match(/\b(?:up to|maximum|max)\s+(\d+)\s*(?:years?|yrs?)\b/);
  if (upperBound?.[1] !== undefined) {
    return { minimumMonths: 0, maximumMonths: Number(upperBound[1]) * 12 };
  }

  const minimumYears = text.match(/\b(?:at least|minimum|min)?\s*(\d+)\+?\s*(?:years?|yrs?)\b/);
  if (minimumYears?.[1] !== undefined) {
    return { minimumMonths: Number(minimumYears[1]) * 12 };
  }

  const minimumMonths = text.match(/\b(?:at least|minimum|min)?\s*(\d+)\+?\s*months?\b/);
  if (minimumMonths?.[1] !== undefined) {
    return { minimumMonths: Number(minimumMonths[1]) };
  }

  if (/\b(fresher|new grad|new graduate|entry[ -]level|no experience|required experience:\s*none)\b/.test(text)) {
    return { minimumMonths: 0 };
  }

  return {};
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
