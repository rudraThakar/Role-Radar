import { createApp } from "./app.js";
import { prisma } from "./shared/prisma.js";

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

app.listen(port, () => {
  console.log(`RoleRadar API listening on port ${port}`);
});

process.on("SIGINT", () => {
  prisma.$disconnect().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  prisma.$disconnect().finally(() => process.exit(0));
});
