import { normalizeText } from "./text.js";

export interface SkillSuggestion {
  skill: string;
  matchedAlias: string;
}

const skillAliases: Record<string, string[]> = {
  "C++": ["c++", "cpp"],
  TypeScript: ["typescript", "ts"],
  JavaScript: ["javascript", "js"],
  "Node.js": ["node.js", "nodejs", "node"],
  PostgreSQL: ["postgresql", "postgres"],
  Redis: ["redis"],
  Python: ["python", "py"],
  Java: ["java"],
  Go: ["golang", "go"],
  Kubernetes: ["kubernetes", "k8s"],
  Docker: ["docker"],
  Verilog: ["verilog"],
  SystemVerilog: ["systemverilog", "system verilog", "sv"],
  Yosys: ["yosys"],
  SAT: ["sat solver", "sat"],
  "Computer Architecture": ["computer architecture", "architecture"],
  Firmware: ["firmware"],
  RTL: ["rtl"],
  "Formal Verification": ["formal verification"],
  "Design Verification": ["design verification"]
};

export function suggestSkillsFromText(text: string): SkillSuggestion[] {
  const normalizedText = ` ${normalizeText(text)} `;
  const suggestions: SkillSuggestion[] = [];

  for (const [skill, aliases] of Object.entries(skillAliases)) {
    const matchedAlias = aliases.find((alias) => containsAlias(normalizedText, alias));
    if (matchedAlias !== undefined) {
      suggestions.push({ skill, matchedAlias });
    }
  }

  return suggestions.sort((left, right) => left.skill.localeCompare(right.skill));
}

function containsAlias(normalizedText: string, alias: string): boolean {
  const normalizedAlias = normalizeText(alias);
  if (normalizedText.includes(` ${normalizedAlias} `)) {
    return true;
  }

  if (/[+#.]/.test(normalizedAlias)) {
    return normalizedText.includes(normalizedAlias);
  }

  return false;
}
