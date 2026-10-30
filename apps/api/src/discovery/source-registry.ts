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

type CompactSource = [id: string, companyName: string, careersUrl: string, provider: DiscoveryProvider, domains: ProfileDomain[]];

const software: ProfileDomain[] = ["SOFTWARE", "DATA_ML"];
const hardware: ProfileDomain[] = ["DIGITAL_HARDWARE", "EMBEDDED", "SOFTWARE"];

// Every board below was checked against the provider's public API.
const additionalSources: CompactSource[] = [
  ["amat-workday", "Applied Materials", "https://amat.wd1.myworkdayjobs.com/External", "WORKDAY", [...hardware, "MECHANICAL"]],
  ["broadcom-workday", "Broadcom", "https://broadcom.wd1.myworkdayjobs.com/External_Career", "WORKDAY", [...hardware, "DATA_ML"]],
  ["marvell-workday", "Marvell", "https://marvell.wd1.myworkdayjobs.com/MarvellCareers", "WORKDAY", [...hardware, "DATA_ML"]],
  ["nxp-workday", "NXP", "https://nxp.wd3.myworkdayjobs.com/careers", "WORKDAY", [...hardware, "DATA_ML"]],
  ["adobe-workday", "Adobe", "https://adobe.wd5.myworkdayjobs.com/external_experienced", "WORKDAY", software],
  ["salesforce-workday", "Salesforce", "https://salesforce.wd12.myworkdayjobs.com/External_Career_Site", "WORKDAY", software],
  ["mastercard-workday", "Mastercard", "https://mastercard.wd1.myworkdayjobs.com/CorporateCareers", "WORKDAY", software],
  ["cisco-workday", "Cisco", "https://cisco.wd5.myworkdayjobs.com/Cisco_Careers", "WORKDAY", [...software, "EMBEDDED", "DIGITAL_HARDWARE"]],
  ["hpe-workday", "Hewlett Packard Enterprise", "https://hpe.wd5.myworkdayjobs.com/Jobsathpe", "WORKDAY", [...software, "EMBEDDED"]],
  ["groww-greenhouse", "Groww", "https://boards.greenhouse.io/groww", "GREENHOUSE", software],
  ["airbnb-greenhouse", "Airbnb", "https://boards.greenhouse.io/airbnb", "GREENHOUSE", software],
  ["coinbase-greenhouse", "Coinbase", "https://boards.greenhouse.io/coinbase", "GREENHOUSE", software],
  ["datadog-greenhouse", "Datadog", "https://boards.greenhouse.io/datadog", "GREENHOUSE", software],
  ["gitlab-greenhouse", "GitLab", "https://boards.greenhouse.io/gitlab", "GREENHOUSE", software],
  ["elastic-greenhouse", "Elastic", "https://boards.greenhouse.io/elastic", "GREENHOUSE", software],
  ["twilio-greenhouse", "Twilio", "https://boards.greenhouse.io/twilio", "GREENHOUSE", software],
  ["okta-greenhouse", "Okta", "https://boards.greenhouse.io/okta", "GREENHOUSE", software],
  ["samsara-greenhouse", "Samsara", "https://boards.greenhouse.io/samsara", "GREENHOUSE", [...software, "EMBEDDED"]],
  ["toast-greenhouse", "Toast", "https://boards.greenhouse.io/toast", "GREENHOUSE", software],
  ["robinhood-greenhouse", "Robinhood", "https://boards.greenhouse.io/robinhood", "GREENHOUSE", software],
  ["instacart-greenhouse", "Instacart", "https://boards.greenhouse.io/instacart", "GREENHOUSE", software],
  ["lyft-greenhouse", "Lyft", "https://boards.greenhouse.io/lyft", "GREENHOUSE", software],
  ["pinterest-greenhouse", "Pinterest", "https://boards.greenhouse.io/pinterest", "GREENHOUSE", software],
  ["reddit-greenhouse", "Reddit", "https://boards.greenhouse.io/reddit", "GREENHOUSE", software],
  ["discord-greenhouse", "Discord", "https://boards.greenhouse.io/discord", "GREENHOUSE", software],
  ["asana-greenhouse", "Asana", "https://boards.greenhouse.io/asana", "GREENHOUSE", software],
  ["dropbox-greenhouse", "Dropbox", "https://boards.greenhouse.io/dropbox", "GREENHOUSE", software],
  ["roblox-greenhouse", "Roblox", "https://boards.greenhouse.io/roblox", "GREENHOUSE", software],
  ["vercel-greenhouse", "Vercel", "https://boards.greenhouse.io/vercel", "GREENHOUSE", software],
  ["glean-greenhouse", "Glean", "https://boards.greenhouse.io/gleanwork", "GREENHOUSE", software],
  ["sigma-greenhouse", "Sigma Computing", "https://boards.greenhouse.io/sigmacomputing", "GREENHOUSE", software],
  ["esri-greenhouse", "Esri", "https://boards.greenhouse.io/esri", "GREENHOUSE", ["SOFTWARE", "CIVIL"]],
  ["cred-lever", "CRED", "https://jobs.lever.co/cred", "LEVER", software],
  ["zeta-lever", "Zeta", "https://jobs.lever.co/zeta", "LEVER", software],
  ["palantir-lever", "Palantir", "https://jobs.lever.co/palantir", "LEVER", software],
  ["notion-ashby", "Notion", "https://jobs.ashbyhq.com/notion", "ASHBY", software],
  ["ramp-ashby", "Ramp", "https://jobs.ashbyhq.com/ramp", "ASHBY", software],
  ["deel-ashby", "Deel", "https://jobs.ashbyhq.com/deel", "ASHBY", software],
  ["cohere-ashby", "Cohere", "https://jobs.ashbyhq.com/cohere", "ASHBY", software],
  ["perplexity-ashby", "Perplexity", "https://jobs.ashbyhq.com/perplexity", "ASHBY", software]
];

const knownIds = new Set(defaultDiscoverySources.map((source) => source.id));
for (const [id, companyName, careersUrl, provider, domains] of additionalSources) {
  if (knownIds.has(id)) continue;
  defaultDiscoverySources.push({ id, companyName, careersUrl, provider, domains, locations: [], roleKeywords: [] });
}
