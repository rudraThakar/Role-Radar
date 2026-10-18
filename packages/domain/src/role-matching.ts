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

const aliases: Record<string, string> = {
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

  return matches / preferredTokens.size;
}

function meaningfulRoleTokens(value: string): Set<string> {
  return new Set(
    [...tokenize(value)]
      .filter((token) => !genericRoleTokens.has(token))
      .map((token) => aliases[token] ?? token)
  );
}
