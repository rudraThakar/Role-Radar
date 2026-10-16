import { PrismaCompanyWatchRepository } from "./company-watches/company-watch.repository.js";
import { PrismaJobRepository } from "./jobs/job.repository.js";
import { prisma } from "./shared/prisma.js";
import { PlatformCareerPageFetcher } from "./watch-checker/career-page-fetcher.js";
import { WatchCheckerService } from "./watch-checker/watch-checker.service.js";

async function main(): Promise<void> {
  const service = new WatchCheckerService(
    new PrismaCompanyWatchRepository(prisma),
    new PrismaJobRepository(prisma),
    new PlatformCareerPageFetcher()
  );
  const summary = await service.checkDueWatches();

  console.log("Watch check complete");
  console.log(`Checked: ${summary.checked}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Created jobs: ${summary.created}`);
  console.log(`Updated jobs: ${summary.updated}`);
  console.log(`Failed checks: ${summary.failed}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
