import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client.js";

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
    // The script can still work when environment variables are set by the shell or VPS process manager.
  }
}

loadEnvFile();

const databaseUrl = process.env.DATABASE_URL?.trim();
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD ?? "";

if (!databaseUrl) {
  console.error("DATABASE_URL is missing. Add it to .env or your VPS environment first.");
  process.exit(1);
}

if (!adminEmail || !adminPassword) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set before creating the first admin.");
  process.exit(1);
}

if (adminPassword.length < 8 || adminPassword === "change-this-password") {
  console.error("Use a stronger ADMIN_PASSWORD before creating the first admin.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

try {
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: Role.ADMIN,
      emailVerified: true,
    },
    create: {
      fullName: "Platform Admin",
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  console.log(`Admin user ready: ${admin.email}`);
} catch (error) {
  console.error("Failed to create admin user.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
