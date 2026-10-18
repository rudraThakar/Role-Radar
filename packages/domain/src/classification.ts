import type { CanonicalJob, ProfileDomain } from "./job.js";
import { normalizeText } from "./text.js";

const domainSignals: Record<ProfileDomain, string[]> = {
  SOFTWARE: [
    "software",
    "backend",
    "frontend",
    "full stack",
    "node",
    "typescript",
    "java",
    "python",
    "distributed systems"
  ],
  DIGITAL_HARDWARE: [
    "rtl",
    "verilog",
    "systemverilog",
    "vlsi",
    "formal verification",
    "design verification",
    "asic",
    "fpga"
  ],
  EMBEDDED: ["embedded", "firmware", "microcontroller", "rtos", "device driver"],
  DATA_ML: ["machine learning", "data scientist", "ml engineer", "pytorch", "tensorflow"],
  RESEARCH: ["research", "scientist", "publication", "phd"],
  MECHANICAL: [
    "mechanical",
    "solidworks",
    "catia",
    "creo",
    "manufacturing",
    "thermodynamics",
    "hvac",
    "finite element",
    "stress analysis",
    "fea"
  ],
  CIVIL: [
    "civil",
    "structural",
    "construction",
    "site engineer",
    "autocad",
    "revit",
    "building information modeling",
    "geotechnical",
    "quantity surveyor",
    "transportation engineering"
  ]
};

export interface DomainClassification {
  domains: ProfileDomain[];
  evidence: string[];
}

export function classifyJobDomain(job: Pick<CanonicalJob, "title" | "description" | "skills">): DomainClassification {
  const searchableText = normalizeText(`${job.title} ${job.description} ${job.skills.join(" ")}`);
  const domains: ProfileDomain[] = [];
  const evidence: string[] = [];

  for (const [domain, signals] of Object.entries(domainSignals) as Array<[ProfileDomain, string[]]>) {
    const matchedSignal = signals.find((signal) => searchableText.includes(normalizeText(signal)));
    if (matchedSignal !== undefined) {
      domains.push(domain);
      evidence.push(`${domain}: matched "${matchedSignal}"`);
    }
  }

  return { domains, evidence };
}
