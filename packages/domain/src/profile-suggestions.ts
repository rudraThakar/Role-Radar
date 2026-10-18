import type { ProfileDomain } from "./job.js";
import { normalizeText } from "./text.js";

export interface RoleSuggestion {
  role: string;
  domain: ProfileDomain;
  matchedAlias: string;
}

export interface DomainSuggestion {
  domain: ProfileDomain;
  score: number;
  evidence: string[];
}

export interface ProfileTargetSuggestion {
  roles: RoleSuggestion[];
  domains: DomainSuggestion[];
}

const roleAliases: Array<{ role: string; domain: ProfileDomain; aliases: string[] }> = [
  {
    role: "Backend Engineer",
    domain: "SOFTWARE",
    aliases: ["backend", "api", "rest", "node", "express", "server"]
  },
  {
    role: "Frontend Engineer",
    domain: "SOFTWARE",
    aliases: ["frontend", "react", "vue", "angular", "ui"]
  },
  {
    role: "Full Stack Engineer",
    domain: "SOFTWARE",
    aliases: ["full stack", "fullstack"]
  },
  {
    role: "RTL Design Engineer",
    domain: "DIGITAL_HARDWARE",
    aliases: ["rtl", "verilog", "systemverilog", "asic", "fpga"]
  },
  {
    role: "Design Verification Engineer",
    domain: "DIGITAL_HARDWARE",
    aliases: ["design verification", "uvm", "testbench", "verification"]
  },
  {
    role: "Embedded Software Engineer",
    domain: "EMBEDDED",
    aliases: ["embedded", "firmware", "microcontroller", "rtos", "device driver"]
  },
  {
    role: "Machine Learning Engineer",
    domain: "DATA_ML",
    aliases: ["machine learning", "ml engineer", "pytorch", "tensorflow", "model training"]
  },
  {
    role: "Research Engineer",
    domain: "RESEARCH",
    aliases: ["research", "publication", "prototype", "experiment"]
  }
];

export function suggestProfileTargetsFromText(text: string): ProfileTargetSuggestion {
  const normalizedText = ` ${normalizeText(text)} `;
  const roles: RoleSuggestion[] = [];
  const domainEvidence = new Map<ProfileDomain, string[]>();

  for (const candidate of roleAliases) {
    const matchedAlias = candidate.aliases.find((alias) => containsAlias(normalizedText, alias));
    if (matchedAlias === undefined) {
      continue;
    }

    roles.push({ role: candidate.role, domain: candidate.domain, matchedAlias });
    const evidence = domainEvidence.get(candidate.domain) ?? [];
    evidence.push(`${candidate.role}: matched "${matchedAlias}"`);
    domainEvidence.set(candidate.domain, evidence);
  }

  const domains = [...domainEvidence.entries()]
    .map(([domain, evidence]) => ({
      domain,
      score: evidence.length,
      evidence
    }))
    .sort((left, right) => right.score - left.score || left.domain.localeCompare(right.domain));

  return {
    roles: roles.sort((left, right) => left.role.localeCompare(right.role)),
    domains
  };
}

function containsAlias(normalizedText: string, alias: string): boolean {
  return normalizedText.includes(` ${normalizeText(alias)} `);
}
