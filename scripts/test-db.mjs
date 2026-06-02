import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

function loadEnvFile() {
  try {
    const envPath = resolve(process.cwd(), ".env");
    const envFile = readFileSync(envPath, "utf8");

    for (const line of envFile.split(/\r?\n/)) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#") || !trimmedLine.includes("=")) {
        continue;
      }

      const [key, ...valueParts] = trimmedLine.split("=");
      const value = valueParts.join("=").replace(/^"|"$/g, "");
      process.env[key] ??= value;
    }
  } catch {
    // The script can still work when DATABASE_URL is set by the shell or hosting provider.
  }
}

loadEnvFile();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env first.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

try {
  await prisma.$queryRaw`SELECT 1`;
  console.log("Database connection successful.");
} catch (error) {
  console.error("Database connection failed.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
