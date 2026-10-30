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
    "distributed systems",
    "sde",
    "swe",
    "developer",
    "programmer",
    "devops",
    "site reliability",
    "sre",
    "full-stack",
    "golang",
    "kotlin",
    "android",
    "ios",
    "react",
    "cloud",
    "platform engineer",
    "api",
    "qa engineer",
    "test engineer",
    "software engineer"
  ],
  DIGITAL_HARDWARE: [
    "rtl",
    "verilog",
    "systemverilog",
    "vlsi",
    "formal verification",
    "design verification",
    "asic",
    "fpga",
    "physical design",
    "dft",
    "uvm",
    "soc",
    "silicon",
    "pre-silicon",
    "post-silicon",
    "logic design",
    "circuit design",
    "digital design",
    "emulation",
    "timing closure"
  ],
  EMBEDDED: [
    "embedded",
    "firmware",
    "microcontroller",
    "rtos",
    "device driver",
    "bsp",
    "bootloader",
    "autosar",
    "linux kernel",
    "kernel driver"
  ],
  DATA_ML: [
    "machine learning",
    "data scientist",
    "ml engineer",
    "pytorch",
    "tensorflow",
    "data engineer",
    "data analyst",
    "deep learning",
    "llm",
    "nlp",
    "computer vision",
    "applied scientist",
    "mlops",
    "ai engineer"
  ],
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

function containsSignal(normalizedText: string, signal: string): boolean {
  const normalizedSignal = normalizeText(signal);
  const escaped = normalizedSignal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).test(normalizedText);
}

export function classifyJobDomain(job: Pick<CanonicalJob, "title" | "description" | "skills">): DomainClassification {
  const title = normalizeText(job.title);
  const body = normalizeText(`${job.description} ${job.skills.join(" ")}`);
  const domains: ProfileDomain[] = [];
  const evidence: string[] = [];

  for (const [domain, signals] of Object.entries(domainSignals) as Array<[ProfileDomain, string[]]>) {
    // A signal in the title is decisive. In the body a single incidental
    // mention ("we also use Python") is not enough, so require two signals.
    const titleSignal = signals.find((signal) => containsSignal(title, signal));
    if (titleSignal !== undefined) {
      domains.push(domain);
      evidence.push(`${domain}: title matched "${titleSignal}"`);
      continue;
    }

    const bodySignals = signals.filter((signal) => containsSignal(body, signal));
    if (bodySignals.length >= 2) {
      domains.push(domain);
      evidence.push(`${domain}: description matched "${bodySignals.slice(0, 2).join('", "')}"`);
    }
  }

  return { domains, evidence };
}
