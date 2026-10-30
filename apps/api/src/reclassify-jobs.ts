import { normalizeRawJobPosting } from "./ingestion/job-normalizer.js";
import { prisma } from "./shared/prisma.js";

const batchSize = 200;

// Re-derives domains, seniority and experience for stored jobs after the
// classification rules change, so old rows stop leaking into the wrong feeds.
async function main(): Promise<void> {
  let cursor: string | undefined;
  let updated = 0;

  for (;;) {
    const jobs = await prisma.job.findMany({
      take: batchSize,
      orderBy: { id: "asc" },
      ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 })
    });
    if (jobs.length === 0) break;

    for (const job of jobs) {
      const normalized = normalizeRawJobPosting({
        companyName: job.companyName,
        title: job.title,
        description: job.description,
        sourceUrl: job.sourceUrl,
        locations: job.locations
      });
      await prisma.job.update({
        where: { id: job.id },
        data: {
          domains: normalized.domains as never,
          seniority: normalized.seniority,
          employmentType: normalized.employmentType,
          minimumExperienceMonths: normalized.minimumExperienceMonths ?? null,
          maximumExperienceMonths: normalized.maximumExperienceMonths ?? null
        }
      });
      updated += 1;
    }

    cursor = jobs[jobs.length - 1]?.id;
  }

  console.log(`Reclassified ${updated} jobs`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
