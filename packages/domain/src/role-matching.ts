import { normalizeText, tokenize } from "./text.js";

const genericRoleTokens = new Set([
  "associate",
  "developer",
  "engineer",
  "engineering",
  "graduate",
  "intern",
  "junior",
  "lead",
  "level",
  "new",
  "principal",
  "role",
  "senior",
  "staff"
]);

const softwareFamily = new Set(["software", "backend", "frontend", "full", "stack", "fullstack", "web", "platform", "cloud"]);

const aliases: Record<string, string> = {
  sde: "software",
  swe: "software",
  software: "software",
  programmer: "software",
  backend: "backend",
  server: "backend",
  frontend: "frontend",
  ui: "frontend",
  firmware: "embedded",
  verification: "verification",
  dv: "verification",
  physical: "physical-design",
  pd: "physical-design",
  structural: "structural",
  structure: "structural"
};

export function roleTitleMatchScore(jobTitle: string, preferredRole: string): number {
  const normalizedJobTitle = normalizeText(jobTitle);
  const normalizedRole = normalizeText(preferredRole);
  if (normalizedJobTitle.includes(normalizedRole)) {
    return 1;
  }

  const jobTokens = meaningfulRoleTokens(normalizedJobTitle);
  const preferredTokens = meaningfulRoleTokens(normalizedRole);
  if (preferredTokens.size === 0) {
    return 0;
  }

  let matches = 0;
  for (const token of preferredTokens) {
    if (jobTokens.has(token)) matches += 1;
  }

  const score = matches / preferredTokens.size;

  // A generic "Software Engineer" posting is a legitimate hit for a backend,
  // frontend or full-stack profile when the posting names no other specialty.
  const preferredIsSoftwareSpecialty = [...preferredTokens].every((token) => softwareFamily.has(token));
  if (preferredIsSoftwareSpecialty && jobTokens.has("software")) {
    return Math.max(score, 0.6);
  }

  return score;
}

function meaningfulRoleTokens(value: string): Set<string> {
  return new Set(
    [...tokenize(value)]
      .filter((token) => !genericRoleTokens.has(token))
      .map((token) => aliases[token] ?? token)
  );
}
