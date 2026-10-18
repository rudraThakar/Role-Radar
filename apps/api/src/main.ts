import { createApp } from "./app.js";
import { prisma } from "./shared/prisma.js";
import { validateRuntimeEnvironment } from "./shared/runtime-config.js";

validateRuntimeEnvironment(process.env);
const port = Number(process.env.PORT ?? 3000);
const app = createApp();

const server = app.listen(port, () => {
  console.log(`RoleRadar API listening on port ${port}`);
});

let isShuttingDown = false;

function shutDown(signal: string): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received; stopping RoleRadar API`);

  const forceExitTimer = setTimeout(() => process.exit(1), 10_000);
  forceExitTimer.unref();

  server.close((error) => {
    prisma.$disconnect().finally(() => {
      clearTimeout(forceExitTimer);
      process.exit(error === undefined ? 0 : 1);
    });
  });
}

process.on("SIGINT", () => shutDown("SIGINT"));
process.on("SIGTERM", () => shutDown("SIGTERM"));
