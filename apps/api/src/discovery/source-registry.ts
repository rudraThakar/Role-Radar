import type { CompanyStage, ProfileDomain } from "@roleradar/domain";

import { verifiedSources } from "./verified-sources.js";

export type DiscoveryProvider = "GREENHOUSE" | "LEVER" | "ASHBY" | "WORKDAY" | "WORKABLE" | "SMARTRECRUITERS" | "EIGHTFOLD" | "ORACLE_HCM" | "HTML";

export interface DiscoverySource {
  id: string;
  companyName: string;
  careersUrl: string;
  provider: DiscoveryProvider;
  domains: ProfileDomain[];
  locations: string[];
  roleKeywords: string[];
  stage?: CompanyStage;
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

type CompactSource = [
  id: string,
  companyName: string,
  careersUrl: string,
  provider: DiscoveryProvider,
  domains: ProfileDomain[],
  stage?: CompanyStage
];

const software: ProfileDomain[] = ["SOFTWARE", "DATA_ML", "PRODUCT", "DESIGN"];
const hardware: ProfileDomain[] = ["DIGITAL_HARDWARE", "EMBEDDED", "ELECTRICAL", "SOFTWARE"];
const industrial: ProfileDomain[] = ["MECHANICAL", "CIVIL", "ELECTRICAL", "OPERATIONS"];
const business: ProfileDomain[] = ["FINANCE", "SALES", "MARKETING", "HUMAN_RESOURCES", "OPERATIONS", "PRODUCT", "SOFTWARE", "DATA_ML"];

// Every board below was checked against the provider's public API. Companies
// marked "STARTUP" are a curated list of venture-backed, growth-stage
// companies with a strong funding track record, not an automated guess.
const additionalSources: CompactSource[] = [
  // Established employers by field
  ["amat-workday", "Applied Materials", "https://amat.wd1.myworkdayjobs.com/External", "WORKDAY", [...hardware, "MECHANICAL"]],
  ["broadcom-workday", "Broadcom", "https://broadcom.wd1.myworkdayjobs.com/External_Career", "WORKDAY", hardware],
  ["marvell-workday", "Marvell", "https://marvell.wd1.myworkdayjobs.com/MarvellCareers", "WORKDAY", hardware],
  ["nxp-workday", "NXP", "https://nxp.wd3.myworkdayjobs.com/careers", "WORKDAY", hardware],
  ["kla-workday", "KLA", "https://kla.wd1.myworkdayjobs.com/Search", "WORKDAY", [...hardware, "MECHANICAL"]],
  ["adobe-workday", "Adobe", "https://adobe.wd5.myworkdayjobs.com/external_experienced", "WORKDAY", software],
  ["salesforce-workday", "Salesforce", "https://salesforce.wd12.myworkdayjobs.com/External_Career_Site", "WORKDAY", [...software, "SALES"]],
  ["workday-workday", "Workday", "https://workday.wd5.myworkdayjobs.com/Workday", "WORKDAY", software],
  ["cisco-workday", "Cisco", "https://cisco.wd5.myworkdayjobs.com/Cisco_Careers", "WORKDAY", [...software, ...hardware]],
  ["hpe-workday", "Hewlett Packard Enterprise", "https://hpe.wd5.myworkdayjobs.com/Jobsathpe", "WORKDAY", [...software, "EMBEDDED"]],
  ["paypal-workday", "PayPal", "https://paypal.wd1.myworkdayjobs.com/jobs", "WORKDAY", [...software, "FINANCE"]],
  ["visa-workday", "Visa", "https://visa.wd5.myworkdayjobs.com/Visa", "WORKDAY", [...software, ...business]],
  ["mastercard-workday", "Mastercard", "https://mastercard.wd1.myworkdayjobs.com/CorporateCareers", "WORKDAY", [...software, ...business]],
  ["capitalone-workday", "Capital One", "https://capitalone.wd12.myworkdayjobs.com/Capital_One", "WORKDAY", [...software, ...business]],
  ["citi-workday", "Citi", "https://citi.wd5.myworkdayjobs.com/2", "WORKDAY", business],
  ["wellsfargo-workday", "Wells Fargo", "https://wf.wd1.myworkdayjobs.com/WellsFargoJobs", "WORKDAY", business],
  ["blackrock-workday", "BlackRock", "https://blackrock.wd1.myworkdayjobs.com/BlackRock_Professional", "WORKDAY", business],
  ["pwc-workday", "PwC", "https://pwc.wd3.myworkdayjobs.com/Global_Experienced_Careers", "WORKDAY", business],
  ["3m-workday", "3M", "https://3m.wd1.myworkdayjobs.com/Search", "WORKDAY", industrial],
  ["caterpillar-workday", "Caterpillar", "https://cat.wd5.myworkdayjobs.com/CaterpillarCareers", "WORKDAY", industrial],
  ["gevernova-workday", "GE Vernova", "https://gevernova.wd5.myworkdayjobs.com/Vernova_ExternalSite", "WORKDAY", industrial],
  ["boeing-workday", "Boeing", "https://boeing.wd1.myworkdayjobs.com/EXTERNAL_CAREERS", "WORKDAY", industrial],
  ["northrop-workday", "Northrop Grumman", "https://ngc.wd1.myworkdayjobs.com/Northrop_Grumman_External_Site", "WORKDAY", [...industrial, "SOFTWARE"]],
  ["medtronic-workday", "Medtronic", "https://medtronic.wd1.myworkdayjobs.com/MedtronicCareers", "WORKDAY", [...industrial, "EMBEDDED", "SOFTWARE"]],
  ["esri-greenhouse", "Esri", "https://boards.greenhouse.io/esri", "GREENHOUSE", ["SOFTWARE", "CIVIL"]],
  ["airtable-greenhouse", "Airtable", "https://boards.greenhouse.io/airtable", "GREENHOUSE", software],
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
  ["zscaler-greenhouse", "Zscaler", "https://boards.greenhouse.io/zscaler", "GREENHOUSE", software],
  ["netskope-greenhouse", "Netskope", "https://boards.greenhouse.io/netskope", "GREENHOUSE", software],
  ["rubrik-greenhouse", "Rubrik", "https://boards.greenhouse.io/rubrik", "GREENHOUSE", software],
  ["sumologic-greenhouse", "Sumo Logic", "https://boards.greenhouse.io/sumologic", "GREENHOUSE", software],
  ["druva-greenhouse", "Druva", "https://boards.greenhouse.io/druva", "GREENHOUSE", software],
  ["freshworks-lever", "Freshworks", "https://jobs.lever.co/freshworks", "LEVER", software],
  ["palantir-lever", "Palantir", "https://jobs.lever.co/palantir", "LEVER", software],
  ["zeta-lever", "Zeta", "https://jobs.lever.co/zeta", "LEVER", software],

  // Large employers on Eightfold / Oracle HCM (their own career sites)
  ["qualcomm-eightfold", "Qualcomm", "https://careers.qualcomm.com/careers?domain=qualcomm.com&location=India", "EIGHTFOLD", hardware],
  ["microsoft-eightfold", "Microsoft", "https://apply.careers.microsoft.com/careers?domain=microsoft.com&location=India", "EIGHTFOLD", [...software, "SALES"]],
  ["micron-eightfold", "Micron Technology", "https://careers.micron.com/careers?domain=micron.com&location=India", "EIGHTFOLD", [...hardware, "MECHANICAL"]],
  ["ti-oracle-hcm", "Texas Instruments", "https://edbz.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/jobs", "ORACLE_HCM", hardware],

  // Startups: venture-backed, growth-stage, actively hiring
  ["vercel-greenhouse", "Vercel", "https://boards.greenhouse.io/vercel", "GREENHOUSE", software, "STARTUP"],
  ["glean-greenhouse", "Glean", "https://boards.greenhouse.io/gleanwork", "GREENHOUSE", software, "STARTUP"],
  ["sigma-greenhouse", "Sigma Computing", "https://boards.greenhouse.io/sigmacomputing", "GREENHOUSE", software, "STARTUP"],
  ["groww-greenhouse", "Groww", "https://boards.greenhouse.io/groww", "GREENHOUSE", software, "STARTUP"],
  ["brex-greenhouse", "Brex", "https://boards.greenhouse.io/brex", "GREENHOUSE", [...software, "FINANCE"], "STARTUP"],
  ["chime-greenhouse", "Chime", "https://boards.greenhouse.io/chime", "GREENHOUSE", software],
  ["gusto-greenhouse", "Gusto", "https://boards.greenhouse.io/gusto", "GREENHOUSE", software, "STARTUP"],
  ["mercury-greenhouse", "Mercury", "https://boards.greenhouse.io/mercury", "GREENHOUSE", software, "STARTUP"],
  ["mixpanel-greenhouse", "Mixpanel", "https://boards.greenhouse.io/mixpanel", "GREENHOUSE", software, "STARTUP"],
  ["fivetran-greenhouse", "Fivetran", "https://boards.greenhouse.io/fivetran", "GREENHOUSE", software, "STARTUP"],
  ["grafana-greenhouse", "Grafana Labs", "https://boards.greenhouse.io/grafanalabs", "GREENHOUSE", software, "STARTUP"],
  ["launchdarkly-greenhouse", "LaunchDarkly", "https://boards.greenhouse.io/launchdarkly", "GREENHOUSE", software, "STARTUP"],
  ["cockroach-greenhouse", "Cockroach Labs", "https://boards.greenhouse.io/cockroachlabs", "GREENHOUSE", software, "STARTUP"],
  ["planetscale-greenhouse", "PlanetScale", "https://boards.greenhouse.io/planetscale", "GREENHOUSE", software, "STARTUP"],
  ["webflow-greenhouse", "Webflow", "https://boards.greenhouse.io/webflow", "GREENHOUSE", software, "STARTUP"],
  ["together-greenhouse", "Together AI", "https://boards.greenhouse.io/togetherai", "GREENHOUSE", software, "STARTUP"],
  ["ripple-greenhouse", "Ripple", "https://boards.greenhouse.io/ripple", "GREENHOUSE", software, "STARTUP"],
  ["observeai-greenhouse", "Observe.AI", "https://boards.greenhouse.io/observeai", "GREENHOUSE", software, "STARTUP"],
  ["anthropic-greenhouse", "Anthropic", "https://boards.greenhouse.io/anthropic", "GREENHOUSE", software, "STARTUP"],
  ["spacex-greenhouse", "SpaceX", "https://boards.greenhouse.io/spacex", "GREENHOUSE", [...industrial, ...hardware], "STARTUP"],
  ["rocketlab-greenhouse", "Rocket Lab", "https://boards.greenhouse.io/rocketlab", "GREENHOUSE", [...industrial, ...hardware], "STARTUP"],
  ["waymo-greenhouse", "Waymo", "https://boards.greenhouse.io/waymo", "GREENHOUSE", [...software, ...hardware], "STARTUP"],
  ["nuro-greenhouse", "Nuro", "https://boards.greenhouse.io/nuro", "GREENHOUSE", [...software, ...hardware], "STARTUP"],
  ["archer-greenhouse", "Archer Aviation", "https://boards.greenhouse.io/archer", "GREENHOUSE", [...industrial, ...hardware], "STARTUP"],
  ["etched-greenhouse", "Etched", "https://boards.greenhouse.io/etchedai", "GREENHOUSE", hardware, "STARTUP"],
  ["lightmatter-greenhouse", "Lightmatter", "https://boards.greenhouse.io/lightmatter", "GREENHOUSE", hardware, "STARTUP"],
  ["formlabs-greenhouse", "Formlabs", "https://boards.greenhouse.io/formlabs", "GREENHOUSE", [...industrial, ...hardware], "STARTUP"],
  ["markforged-greenhouse", "Markforged", "https://boards.greenhouse.io/markforged", "GREENHOUSE", [...industrial, ...hardware], "STARTUP"],
  ["consensys-greenhouse", "Consensys", "https://boards.greenhouse.io/consensys", "GREENHOUSE", software, "STARTUP"],
  ["meesho-lever", "Meesho", "https://jobs.lever.co/meesho", "LEVER", software, "STARTUP"],
  ["cred-lever", "CRED", "https://jobs.lever.co/cred", "LEVER", software, "STARTUP"],
  ["mistral-lever", "Mistral AI", "https://jobs.lever.co/mistral", "LEVER", software, "STARTUP"],
  ["anyscale-lever", "Anyscale", "https://jobs.lever.co/anyscale", "LEVER", software, "STARTUP"],
  ["velo3d-lever", "Velo3D", "https://jobs.lever.co/velo3d", "LEVER", [...industrial, ...hardware], "STARTUP"],
  ["notion-ashby", "Notion", "https://jobs.ashbyhq.com/notion", "ASHBY", software, "STARTUP"],
  ["ramp-ashby", "Ramp", "https://jobs.ashbyhq.com/ramp", "ASHBY", [...software, "FINANCE"], "STARTUP"],
  ["deel-ashby", "Deel", "https://jobs.ashbyhq.com/deel", "ASHBY", [...software, ...business], "STARTUP"],
  ["cohere-ashby", "Cohere", "https://jobs.ashbyhq.com/cohere", "ASHBY", software, "STARTUP"],
  ["perplexity-ashby", "Perplexity", "https://jobs.ashbyhq.com/perplexity", "ASHBY", software, "STARTUP"],
  ["airbyte-ashby", "Airbyte", "https://jobs.ashbyhq.com/airbyte", "ASHBY", software, "STARTUP"],
  ["alchemy-ashby", "Alchemy", "https://jobs.ashbyhq.com/alchemy", "ASHBY", software, "STARTUP"],
  ["amplitude-ashby", "Amplitude", "https://jobs.ashbyhq.com/amplitude", "ASHBY", software],
  ["cerebras-ashby", "Cerebras", "https://jobs.ashbyhq.com/cerebras", "ASHBY", hardware, "STARTUP"],
  ["clickhouse-ashby", "ClickHouse", "https://jobs.ashbyhq.com/clickhouse", "ASHBY", software, "STARTUP"],
  ["confluent-ashby", "Confluent", "https://jobs.ashbyhq.com/confluent", "ASHBY", software],
  ["cursor-ashby", "Cursor", "https://jobs.ashbyhq.com/cursor", "ASHBY", software, "STARTUP"],
  ["dmatrix-ashby", "d-Matrix", "https://jobs.ashbyhq.com/d-matrix", "ASHBY", hardware, "STARTUP"],
  ["drata-ashby", "Drata", "https://jobs.ashbyhq.com/drata", "ASHBY", software, "STARTUP"],
  ["elevenlabs-ashby", "ElevenLabs", "https://jobs.ashbyhq.com/elevenlabs", "ASHBY", software, "STARTUP"],
  ["harvey-ashby", "Harvey", "https://jobs.ashbyhq.com/harvey", "ASHBY", software, "STARTUP"],
  ["miro-ashby", "Miro", "https://jobs.ashbyhq.com/miro", "ASHBY", software, "STARTUP"],
  ["modal-ashby", "Modal", "https://jobs.ashbyhq.com/modal", "ASHBY", software, "STARTUP"],
  ["ouster-ashby", "Ouster", "https://jobs.ashbyhq.com/ouster", "ASHBY", hardware, "STARTUP"],
  ["paxos-ashby", "Paxos", "https://jobs.ashbyhq.com/paxos", "ASHBY", software, "STARTUP"],
  ["plaid-ashby", "Plaid", "https://jobs.ashbyhq.com/plaid", "ASHBY", software, "STARTUP"],
  ["posthog-ashby", "PostHog", "https://jobs.ashbyhq.com/posthog", "ASHBY", software, "STARTUP"],
  ["railway-ashby", "Railway", "https://jobs.ashbyhq.com/railway", "ASHBY", software, "STARTUP"],
  ["render-ashby", "Render", "https://jobs.ashbyhq.com/render", "ASHBY", software, "STARTUP"],
  ["replit-ashby", "Replit", "https://jobs.ashbyhq.com/replit", "ASHBY", software, "STARTUP"],
  ["runway-ashby", "Runway", "https://jobs.ashbyhq.com/runway", "ASHBY", software, "STARTUP"],
  ["sarvam-ashby", "Sarvam AI", "https://jobs.ashbyhq.com/sarvam", "ASHBY", software, "STARTUP"],
  ["sentry-ashby", "Sentry", "https://jobs.ashbyhq.com/sentry", "ASHBY", software, "STARTUP"],
  ["skydio-ashby", "Skydio", "https://jobs.ashbyhq.com/skydio", "ASHBY", [...industrial, ...hardware], "STARTUP"],
  ["snowflake-ashby", "Snowflake", "https://jobs.ashbyhq.com/snowflake", "ASHBY", software],
  ["snyk-ashby", "Snyk", "https://jobs.ashbyhq.com/snyk", "ASHBY", software, "STARTUP"],
  ["temporal-ashby", "Temporal", "https://jobs.ashbyhq.com/temporal", "ASHBY", software, "STARTUP"],
  ["vanta-ashby", "Vanta", "https://jobs.ashbyhq.com/vanta", "ASHBY", software, "STARTUP"],
  ["wayve-ashby", "Wayve", "https://jobs.ashbyhq.com/wayve", "ASHBY", [...software, ...hardware], "STARTUP"],
  ["wiz-ashby", "Wiz", "https://jobs.ashbyhq.com/wiz", "ASHBY", software, "STARTUP"],
  ["writer-ashby", "Writer", "https://jobs.ashbyhq.com/writer", "ASHBY", software, "STARTUP"],
  // India-founded or India-heavy startups
  ["inmobi-greenhouse", "InMobi", "https://boards.greenhouse.io/inmobi", "GREENHOUSE", software, "STARTUP"],
  ["glance-greenhouse", "Glance", "https://boards.greenhouse.io/glance", "GREENHOUSE", software, "STARTUP"],
  ["pocketfm-lever", "Pocket FM", "https://jobs.lever.co/pocketfm", "LEVER", [...software, "MARKETING"], "STARTUP"],
  ["fampay-lever", "FamPay", "https://jobs.lever.co/fampay", "LEVER", [...software, "FINANCE"], "STARTUP"],
  ["mindtickle-lever", "Mindtickle", "https://jobs.lever.co/mindtickle", "LEVER", software, "STARTUP"],
  ["vogo-lever", "Vogo", "https://jobs.lever.co/vogo", "LEVER", [...software, "OPERATIONS"], "STARTUP"],
  ["bounce-ashby", "Bounce", "https://jobs.ashbyhq.com/bounce", "ASHBY", [...software, "OPERATIONS"], "STARTUP"],
  ["navi-ashby", "Navi", "https://jobs.ashbyhq.com/navi", "ASHBY", [...software, "FINANCE"], "STARTUP"],
  ["paytm-lever", "Paytm", "https://jobs.lever.co/paytm", "LEVER", [...software, "FINANCE"]],
  ["zapier-ashby", "Zapier", "https://jobs.ashbyhq.com/zapier", "ASHBY", software, "STARTUP"]
];

const existingStartupIds = new Set([
  "tenstorrent-greenhouse",
  "supabase-ashby",
  "ashbyhq-ashby",
  "linear-ashby",
  "openai-ashby",
  "anduril-greenhouse",
  "scale-ai-greenhouse",
  "stripe-greenhouse",
  "figma-greenhouse",
  "databricks-greenhouse",
  "drivetrain-lever",
  "safe-security-lever",
  "highlevel-lever"
]);

additionalSources.push(...verifiedSources);

const knownIds = new Set(defaultDiscoverySources.map((source) => source.id));
for (const source of defaultDiscoverySources) {
  if (existingStartupIds.has(source.id)) source.stage = "STARTUP";
}
const knownUrls = new Set(defaultDiscoverySources.map((source) => source.careersUrl));
for (const [id, companyName, careersUrl, provider, domains, stage] of additionalSources) {
  if (knownIds.has(id) || knownUrls.has(careersUrl)) continue;
  knownIds.add(id);
  knownUrls.add(careersUrl);
  defaultDiscoverySources.push({
    id,
    companyName,
    careersUrl,
    provider,
    domains: [...new Set(domains)],
    locations: [],
    roleKeywords: [],
    ...(stage === undefined ? {} : { stage })
  });
}
