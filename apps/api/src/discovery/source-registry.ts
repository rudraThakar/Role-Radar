import type { CareerProfile, ProfileDomain } from "@roleradar/domain";

export type DiscoveryProvider = "GREENHOUSE" | "LEVER" | "ASHBY" | "WORKDAY" | "HTML";

export interface DiscoverySource {
  id: string;
  companyName: string;
  careersUrl: string;
  provider: DiscoveryProvider;
  domains: ProfileDomain[];
  locations: string[];
  roleKeywords: string[];
}

export const defaultDiscoverySources: DiscoverySource[] = [
  {
    id: "nvidia-workday",
    companyName: "NVIDIA",
    careersUrl: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite",
    provider: "WORKDAY",
    domains: ["SOFTWARE", "DIGITAL_HARDWARE", "EMBEDDED", "DATA_ML", "RESEARCH"],
    locations: ["Bengaluru", "Hyderabad", "Pune", "Remote", "USA"],
    roleKeywords: ["software", "systems", "backend", "embedded", "rtl", "verification", "ai", "ml"]
  },
  {
    id: "intel-workday",
    companyName: "Intel",
    careersUrl: "https://intel.wd1.myworkdayjobs.com/External",
    provider: "WORKDAY",
    domains: ["SOFTWARE", "DIGITAL_HARDWARE", "EMBEDDED", "DATA_ML", "RESEARCH"],
    locations: ["Bengaluru", "Hyderabad", "Remote", "USA"],
    roleKeywords: ["software", "systems", "embedded", "rtl", "verification", "asic", "fpga", "ai", "ml"]
  },
  {
    id: "amd-html",
    companyName: "AMD",
    careersUrl: "https://careers.amd.com/careers-home/jobs",
    provider: "HTML",
    domains: ["SOFTWARE", "DIGITAL_HARDWARE", "EMBEDDED", "DATA_ML"],
    locations: ["Bengaluru", "Hyderabad", "Remote", "USA"],
    roleKeywords: ["software", "systems", "embedded", "rtl", "verification", "asic", "fpga", "ai", "ml"]
  },
  {
    id: "cadence-workday",
    companyName: "Cadence",
    careersUrl: "https://cadence.wd1.myworkdayjobs.com/External_Careers",
    provider: "WORKDAY",
    domains: ["DIGITAL_HARDWARE", "EMBEDDED", "SOFTWARE"],
    locations: [],
    roleKeywords: ["rtl", "verification", "physical design", "analog", "asic", "fpga", "embedded"]
  },
  {
    id: "micron-workday",
    companyName: "Micron",
    careersUrl: "https://micron.wd1.myworkdayjobs.com/External",
    provider: "WORKDAY",
    domains: ["DIGITAL_HARDWARE", "EMBEDDED", "SOFTWARE", "DATA_ML"],
    locations: [],
    roleKeywords: ["rtl", "verification", "asic", "firmware", "embedded", "memory", "hardware"]
  },
  {
    id: "analog-devices-workday",
    companyName: "Analog Devices",
    careersUrl: "https://analogdevices.wd1.myworkdayjobs.com/External",
    provider: "WORKDAY",
    domains: ["DIGITAL_HARDWARE", "EMBEDDED", "SOFTWARE"],
    locations: [],
    roleKeywords: ["rtl", "verification", "analog", "embedded", "firmware", "hardware", "fpga"]
  },
  {
    id: "tenstorrent-greenhouse",
    companyName: "Tenstorrent",
    careersUrl: "https://boards.greenhouse.io/tenstorrent",
    provider: "GREENHOUSE",
    domains: ["DIGITAL_HARDWARE", "EMBEDDED", "SOFTWARE", "DATA_ML"],
    locations: [],
    roleKeywords: ["rtl", "verification", "asic", "compiler", "firmware", "hardware", "ai"]
  },
  {
    id: "canonical-greenhouse",
    companyName: "Canonical",
    careersUrl: "https://boards.greenhouse.io/canonical",
    provider: "GREENHOUSE",
    domains: ["SOFTWARE", "EMBEDDED", "DATA_ML"],
    locations: ["Remote", "Bengaluru", "Hyderabad", "Pune", "Chennai", "USA"],
    roleKeywords: ["software", "backend", "frontend", "platform", "cloud", "linux", "python"]
  },
  {
    id: "databricks-greenhouse",
    companyName: "Databricks",
    careersUrl: "https://boards.greenhouse.io/databricks",
    provider: "GREENHOUSE",
    domains: ["SOFTWARE", "DATA_ML"],
    locations: ["Bengaluru", "Remote", "USA"],
    roleKeywords: ["software", "backend", "frontend", "platform", "data", "ml", "distributed systems"]
  },
  {
    id: "cloudflare-greenhouse",
    companyName: "Cloudflare",
    careersUrl: "https://boards.greenhouse.io/cloudflare",
    provider: "GREENHOUSE",
    domains: ["SOFTWARE", "DATA_ML"],
    locations: ["Remote", "USA"],
    roleKeywords: ["software", "backend", "frontend", "platform", "systems", "data"]
  },
  {
    id: "mongodb-greenhouse",
    companyName: "MongoDB",
    careersUrl: "https://boards.greenhouse.io/mongodb",
    provider: "GREENHOUSE",
    domains: ["SOFTWARE", "DATA_ML"],
    locations: ["Bengaluru", "Remote", "USA"],
    roleKeywords: ["software", "backend", "frontend", "platform", "database", "data"]
  },
  {
    id: "supabase-ashby",
    companyName: "Supabase",
    careersUrl: "https://jobs.ashbyhq.com/supabase",
    provider: "ASHBY",
    domains: ["SOFTWARE", "DATA_ML"],
    locations: ["Remote", "USA"],
    roleKeywords: ["software", "backend", "frontend", "platform", "database", "data"]
  },
  {
    id: "ashbyhq-ashby",
    companyName: "Ashby",
    careersUrl: "https://jobs.ashbyhq.com/ashby",
    provider: "ASHBY",
    domains: ["SOFTWARE", "DATA_ML"],
    locations: ["Remote", "USA"],
    roleKeywords: ["software", "product", "backend", "frontend", "data"]
  },
  {
    id: "linear-ashby",
    companyName: "Linear",
    careersUrl: "https://jobs.ashbyhq.com/linear",
    provider: "ASHBY",
    domains: ["SOFTWARE"],
    locations: ["Remote", "USA"],
    roleKeywords: ["software", "backend", "frontend", "product", "platform"]
  }
];

export function selectDiscoverySources(profile: CareerProfile, sources: DiscoverySource[]): DiscoverySource[] {
  const excludedCompanies = profile.excludedCompanies.map(normalizeText);

  return sources.filter((source) => {
    const normalizedCompany = normalizeText(source.companyName);
    if (excludedCompanies.includes(normalizedCompany)) {
      return false;
    }

    return source.domains.includes(profile.domain);
  });
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
