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
  const searchableText = normalizeText(`${rawJob.title} ${rawJob.description}`);
  const skills = rawJob.skills ?? inferSkills(searchableText);
  const classification = classifyJobDomain({
    title: rawJob.title,
    description: rawJob.description,
    skills
  });
  const minimumExperienceMonths = inferMinimumExperienceMonths(searchableText);

  const input: CreateJobInput = {
    companyName: rawJob.companyName,
    title: rawJob.title,
    normalizedTitle: normalizeTitle(rawJob.title),
    description: rawJob.description,
    employmentType: inferEmploymentType(searchableText),
    seniority: inferSeniority(searchableText),
    domains: classification.domains.length > 0 ? classification.domains : ["SOFTWARE"],
    skills,
    locations: rawJob.locations ?? inferLocations(rawJob.description),
    workMode: inferWorkMode(searchableText),
    sourceUrl: rawJob.sourceUrl,
    applyUrl: rawJob.applyUrl ?? rawJob.sourceUrl,
    discoveredAt: new Date()
  };

  if (minimumExperienceMonths !== undefined) input.minimumExperienceMonths = minimumExperienceMonths;
  if (rawJob.publishedAt !== undefined) input.publishedAt = rawJob.publishedAt;

  return input;
}

function inferEmploymentType(text: string): EmploymentType {
  if (text.includes("intern")) return "INTERNSHIP";
  if (text.includes("contract")) return "CONTRACT";
  if (text.includes("part time") || text.includes("part-time")) return "PART_TIME";
  return employmentTypes.includes("FULL_TIME") ? "FULL_TIME" : "UNKNOWN";
}

function inferSeniority(text: string): Seniority {
  if (/\b(fresher|new grad|graduate)\b/.test(text)) return "FRESHER";
  if (/\b(entry level|entry-level|junior)\b/.test(text)) return "ENTRY_LEVEL";
  if (/\b(senior|staff|principal|lead)\b/.test(text)) return "SENIOR";
  return seniorityLevels.includes("MID_LEVEL") ? "MID_LEVEL" : "UNKNOWN";
}

function inferMinimumExperienceMonths(text: string): number | undefined {
  const yearMatch = text.match(/(\d+)\+?\s*(?:years|yrs|year)\b/);
  if (yearMatch?.[1] !== undefined) {
    return Number(yearMatch[1]) * 12;
  }

  if (/\b(fresher|new grad|graduate|entry level|entry-level)\b/.test(text)) {
    return 0;
  }

  return undefined;
}

function inferWorkMode(text: string): WorkMode {
  if (text.includes("remote")) return "REMOTE";
  if (text.includes("hybrid")) return "HYBRID";
  if (text.includes("onsite") || text.includes("on-site") || text.includes("office")) return "ONSITE";
  return workModes.includes("UNKNOWN") ? "UNKNOWN" : "ONSITE";
}

function inferLocations(text: string): string[] {
  const knownLocations = ["Bengaluru", "Hyderabad", "Pune", "Chennai", "Gurugram", "Noida", "Mumbai", "Remote", "USA"];
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
    RTL: ["rtl"]
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
