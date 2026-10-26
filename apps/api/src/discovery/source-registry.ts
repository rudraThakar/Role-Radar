import type { ProfileDomain } from "@roleradar/domain";

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
  },
  {
    id: "openai-ashby",
    companyName: "OpenAI",
    careersUrl: "https://jobs.ashbyhq.com/openai",
    provider: "ASHBY",
    domains: ["SOFTWARE", "DATA_ML", "RESEARCH", "DIGITAL_HARDWARE"],
    locations: [],
    roleKeywords: ["software", "systems", "research", "machine learning", "hardware"]
  },
  {
    id: "stripe-greenhouse",
    companyName: "Stripe",
    careersUrl: "https://boards.greenhouse.io/stripe",
    provider: "GREENHOUSE",
    domains: ["SOFTWARE", "DATA_ML"],
    locations: ["Bengaluru", "Remote"],
    roleKeywords: ["software", "backend", "frontend", "infrastructure", "data"]
  },
  {
    id: "figma-greenhouse",
    companyName: "Figma",
    careersUrl: "https://boards.greenhouse.io/figma",
    provider: "GREENHOUSE",
    domains: ["SOFTWARE", "DATA_ML"],
    locations: ["Remote"],
    roleKeywords: ["software", "backend", "frontend", "product", "data"]
  },
  {
    id: "anduril-greenhouse",
    companyName: "Anduril",
    careersUrl: "https://boards.greenhouse.io/andurilindustries",
    provider: "GREENHOUSE",
    domains: ["SOFTWARE", "DIGITAL_HARDWARE", "EMBEDDED", "MECHANICAL", "RESEARCH"],
    locations: [],
    roleKeywords: ["software", "hardware", "embedded", "mechanical", "manufacturing", "systems"]
  },
  {
    id: "scale-ai-greenhouse",
    companyName: "Scale AI",
    careersUrl: "https://boards.greenhouse.io/scaleai",
    provider: "GREENHOUSE",
    domains: ["SOFTWARE", "DATA_ML", "RESEARCH"],
    locations: [],
    roleKeywords: ["software", "machine learning", "research", "data", "infrastructure"]
  },
  {
    id: "3pillar-lever",
    companyName: "3Pillar",
    careersUrl: "https://jobs.lever.co/3pillarglobal",
    provider: "LEVER",
    domains: ["SOFTWARE", "DATA_ML"],
    locations: ["India", "Remote"],
    roleKeywords: ["software", "backend", "frontend", "data", "cloud"]
  },
  {
    id: "drivetrain-lever",
    companyName: "Drivetrain",
    careersUrl: "https://jobs.lever.co/drivetrain",
    provider: "LEVER",
    domains: ["SOFTWARE", "DATA_ML"],
    locations: ["India", "Remote"],
    roleKeywords: ["software", "backend", "frontend", "data", "intern"]
  },
  {
    id: "safe-security-lever",
    companyName: "Safe Security",
    careersUrl: "https://jobs.lever.co/safe",
    provider: "LEVER",
    domains: ["SOFTWARE", "DATA_ML"],
    locations: ["Bengaluru", "New Delhi"],
    roleKeywords: ["software", "backend", "security", "ai", "sdet"]
  },
  {
    id: "highlevel-lever",
    companyName: "HighLevel",
    careersUrl: "https://jobs.lever.co/gohighlevel",
    provider: "LEVER",
    domains: ["SOFTWARE", "DATA_ML"],
    locations: ["India", "Remote"],
    roleKeywords: ["software", "backend", "frontend", "platform", "ai"]
  },
  {
    id: "keyloop-lever",
    companyName: "Keyloop",
    careersUrl: "https://jobs.lever.co/keyloop",
    provider: "LEVER",
    domains: ["SOFTWARE", "DATA_ML"],
    locations: ["Hyderabad", "India"],
    roleKeywords: ["software", "backend", "frontend", "data", "cloud"]
  },
  {
    id: "extreme-networks-lever",
    companyName: "Extreme Networks",
    careersUrl: "https://jobs.lever.co/extremenetworks",
    provider: "LEVER",
    domains: ["SOFTWARE", "EMBEDDED", "DIGITAL_HARDWARE", "DATA_ML"],
    locations: ["Bengaluru", "Chennai", "India"],
    roleKeywords: ["software", "systems", "network", "embedded", "hardware", "ai"]
  },
  {
    id: "saviynt-lever",
    companyName: "Saviynt",
    careersUrl: "https://jobs.lever.co/saviynt",
    provider: "LEVER",
    domains: ["SOFTWARE", "DATA_ML"],
    locations: ["Bengaluru", "India"],
    roleKeywords: ["software", "platform", "security", "cloud", "data"]
  },
  {
    id: "olsson-greenhouse",
    companyName: "Olsson",
    careersUrl: "https://boards.greenhouse.io/olsson",
    provider: "GREENHOUSE",
    domains: ["MECHANICAL", "CIVIL"],
    locations: ["USA"],
    roleKeywords: ["mechanical", "civil", "structural", "water", "construction"]
  },
  {
    id: "aurecon-workday",
    companyName: "Aurecon",
    careersUrl: "https://aurecongroup.wd3.myworkdayjobs.com/aurecon",
    provider: "WORKDAY",
    domains: ["MECHANICAL", "CIVIL", "SOFTWARE", "DATA_ML"],
    locations: [],
    roleKeywords: ["mechanical", "civil", "structural", "transport", "water", "digital"]
  }
];
