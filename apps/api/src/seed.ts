import argon2 from "argon2";

import { prisma } from "./shared/prisma.js";

const demoUser = {
  email: "demo@roleradar.local",
  password: "password123",
  name: "RoleRadar Demo"
};

async function main(): Promise<void> {
  const passwordHash = await argon2.hash(demoUser.password, {
    type: argon2.argon2id
  });

  const user = await prisma.user.upsert({
    where: { email: demoUser.email },
    update: {
      name: demoUser.name,
      passwordHash
    },
    create: {
      email: demoUser.email,
      name: demoUser.name,
      passwordHash
    }
  });

  const sdeProfile = await upsertProfile(user.id, "Backend SDE", {
    domain: "SOFTWARE",
    graduationYear: 2027,
    experienceMonths: 0,
    preferredRoles: ["Backend Engineer", "Software Engineer", "Systems Engineer"],
    preferredLocations: ["Bengaluru", "Hyderabad", "Remote"],
    preferredWorkModes: ["HYBRID", "REMOTE"],
    minimumSalary: 1_200_000,
    salaryCurrency: "INR",
    targetCompanies: ["NVIDIA", "Microsoft", "AMD"],
    excludedCompanies: [],
    includedKeywords: ["backend", "distributed systems", "new grad"],
    excludedKeywords: ["senior", "staff"],
    skills: ["C++", "TypeScript", "Node.js", "PostgreSQL", "Python"],
    seeksEmploymentTypes: ["FULL_TIME"]
  });

  const hardwareProfile = await upsertProfile(user.id, "Digital Hardware", {
    domain: "DIGITAL_HARDWARE",
    graduationYear: 2027,
    experienceMonths: 0,
    preferredRoles: ["RTL Design Engineer", "Design Verification Engineer", "Formal Verification Engineer"],
    preferredLocations: ["Bengaluru", "Hyderabad", "Remote"],
    preferredWorkModes: ["HYBRID", "REMOTE"],
    targetCompanies: ["NVIDIA", "AMD", "Qualcomm", "Intel"],
    excludedCompanies: [],
    includedKeywords: ["rtl", "verification", "new grad"],
    excludedKeywords: ["senior", "principal"],
    skills: ["Verilog", "SystemVerilog", "Yosys", "SAT", "Computer Architecture"],
    seeksEmploymentTypes: ["FULL_TIME"]
  });

  await upsertActiveResume(sdeProfile.id, {
    originalFilename: "sde_resume.pdf",
    mimeType: "application/pdf",
    sizeBytes: 142_000
  });

  await upsertActiveResume(hardwareProfile.id, {
    originalFilename: "hardware_resume.pdf",
    mimeType: "application/pdf",
    sizeBytes: 156_000
  });

  await upsertCompanyWatch(user.id, sdeProfile.id, {
    companyName: "NVIDIA",
    careersUrl: "https://www.nvidia.com/en-in/about-nvidia/careers/",
    websiteUrl: "https://www.nvidia.com",
    checkCadenceDays: 1
  });

  await upsertCompanyWatch(user.id, sdeProfile.id, {
    companyName: "Microsoft",
    careersUrl: "https://jobs.careers.microsoft.com/global/en/search",
    websiteUrl: "https://www.microsoft.com",
    checkCadenceDays: 2
  });

  await upsertCompanyWatch(user.id, hardwareProfile.id, {
    companyName: "AMD",
    careersUrl: "https://careers.amd.com/careers-home",
    websiteUrl: "https://www.amd.com",
    checkCadenceDays: 1
  });

  await upsertJob("https://jobs.example.local/nvidia-new-grad-backend", {
    companyName: "NVIDIA",
    title: "New Grad Backend Software Engineer",
    normalizedTitle: "new grad backend software engineer",
    description: "Entry-level backend role for 2027 graduates. C++ and Python are preferred.",
    employmentType: "FULL_TIME",
    seniority: "ENTRY_LEVEL",
    domains: ["SOFTWARE"],
    skills: ["C++", "Python", "Distributed Systems"],
    minimumExperienceMonths: 0,
    eligibleGraduationYears: [2027],
    locations: ["Bengaluru"],
    workMode: "HYBRID",
    salaryMin: 1_800_000,
    salaryCurrency: "INR",
    applyUrl: "https://jobs.example.local/nvidia-new-grad-backend/apply"
  });

  await upsertJob("https://jobs.example.local/amd-rtl-new-grad", {
    companyName: "AMD",
    title: "New Grad RTL Design Engineer",
    normalizedTitle: "new grad rtl design engineer",
    description: "Fresher-friendly RTL role for 2027 graduates. Verilog and computer architecture are useful.",
    employmentType: "FULL_TIME",
    seniority: "FRESHER",
    domains: ["DIGITAL_HARDWARE"],
    skills: ["Verilog", "Computer Architecture", "SystemVerilog"],
    minimumExperienceMonths: 0,
    eligibleGraduationYears: [2027],
    locations: ["Hyderabad"],
    workMode: "HYBRID",
    applyUrl: "https://jobs.example.local/amd-rtl-new-grad/apply"
  });

  await upsertJob("https://jobs.example.local/embedded-systems-fresher", {
    companyName: "Qualcomm",
    title: "Embedded Systems Engineer Fresher",
    normalizedTitle: "embedded systems engineer fresher",
    description: "Entry-level embedded systems role involving C++, firmware, and computer architecture.",
    employmentType: "FULL_TIME",
    seniority: "FRESHER",
    domains: ["EMBEDDED", "SOFTWARE", "DIGITAL_HARDWARE"],
    skills: ["C++", "Firmware", "Computer Architecture"],
    minimumExperienceMonths: 0,
    eligibleGraduationYears: [2027],
    locations: ["Bengaluru"],
    workMode: "ONSITE",
    applyUrl: "https://jobs.example.local/embedded-systems-fresher/apply"
  });

  await upsertJob("https://jobs.example.local/senior-platform-engineer", {
    companyName: "ExampleCorp",
    title: "Senior Platform Engineer",
    normalizedTitle: "senior platform engineer",
    description: "Requires 5+ years of production platform engineering experience.",
    employmentType: "FULL_TIME",
    seniority: "SENIOR",
    domains: ["SOFTWARE"],
    skills: ["Kubernetes", "Go", "PostgreSQL"],
    minimumExperienceMonths: 60,
    locations: ["Remote"],
    workMode: "REMOTE",
    applyUrl: "https://jobs.example.local/senior-platform-engineer/apply"
  });

  console.log("Seed complete");
  console.log(`Demo user: ${demoUser.email}`);
  console.log(`Demo password: ${demoUser.password}`);
}

async function upsertProfile(
  userId: string,
  name: string,
  data: {
    domain: "SOFTWARE" | "DIGITAL_HARDWARE" | "EMBEDDED" | "DATA_ML" | "RESEARCH";
    graduationYear?: number;
    experienceMonths: number;
    preferredRoles: string[];
    preferredLocations: string[];
    preferredWorkModes: Array<"ONSITE" | "HYBRID" | "REMOTE" | "UNKNOWN">;
    minimumSalary?: number;
    salaryCurrency?: string;
    targetCompanies: string[];
    excludedCompanies: string[];
    includedKeywords: string[];
    excludedKeywords: string[];
    skills: string[];
    seeksEmploymentTypes: Array<"FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "UNKNOWN">;
  }
): Promise<{ id: string }> {
  const existingProfile = await prisma.careerProfile.findFirst({
    where: { userId, name }
  });

  if (existingProfile === null) {
    return prisma.careerProfile.create({
      data: {
        userId,
        name,
        ...data
      },
      select: { id: true }
    });
  }

  return prisma.careerProfile.update({
    where: { id: existingProfile.id },
    data,
    select: { id: true }
  });
}

async function upsertActiveResume(
  profileId: string,
  data: {
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
  }
): Promise<void> {
  const existingResume = await prisma.resume.findFirst({
    where: {
      profileId,
      originalFilename: data.originalFilename
    }
  });

  await prisma.resume.updateMany({
    where: { profileId },
    data: { isActive: false }
  });

  if (existingResume === null) {
    await prisma.resume.create({
      data: {
        profileId,
        ...data,
        extractionStatus: "PENDING",
        isActive: true
      }
    });
    return;
  }

  await prisma.resume.update({
    where: { id: existingResume.id },
    data: {
      ...data,
      isActive: true
    }
  });
}

async function upsertCompanyWatch(
  userId: string,
  profileId: string,
  data: {
    companyName: string;
    careersUrl: string;
    websiteUrl?: string;
    checkCadenceDays: number;
  }
): Promise<void> {
  await prisma.companyWatch.upsert({
    where: {
      userId_profileId_careersUrl: {
        userId,
        profileId,
        careersUrl: data.careersUrl
      }
    },
    update: {
      ...data,
      isActive: true
    },
    create: {
      userId,
      profileId,
      ...data
    }
  });
}

async function upsertJob(
  sourceUrl: string,
  data: {
    companyName: string;
    title: string;
    normalizedTitle: string;
    description: string;
    employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "UNKNOWN";
    seniority: "FRESHER" | "ENTRY_LEVEL" | "MID_LEVEL" | "SENIOR" | "UNKNOWN";
    domains: Array<"SOFTWARE" | "DIGITAL_HARDWARE" | "EMBEDDED" | "DATA_ML" | "RESEARCH">;
    skills: string[];
    minimumExperienceMonths?: number;
    eligibleGraduationYears?: number[];
    locations: string[];
    workMode: "ONSITE" | "HYBRID" | "REMOTE" | "UNKNOWN";
    salaryMin?: number;
    salaryCurrency?: string;
    applyUrl: string;
  }
): Promise<void> {
  const existingJob = await prisma.job.findFirst({
    where: { sourceUrl }
  });

  const discoveredAt = new Date();

  if (existingJob === null) {
    await prisma.job.create({
      data: {
        ...data,
        eligibleGraduationYears: data.eligibleGraduationYears ?? [],
        sourceUrl,
        discoveredAt
      }
    });
    return;
  }

  await prisma.job.update({
    where: { id: existingJob.id },
    data: {
      ...data,
      eligibleGraduationYears: data.eligibleGraduationYears ?? [],
      sourceUrl
    }
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
