import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env before creating the first admin.");
  }

  if (password.length < 8 || password === "change-this-password") {
    throw new Error("Use a stronger ADMIN_PASSWORD before creating the first admin.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: Role.ADMIN,
      emailVerified: true,
    },
    create: {
      fullName: "Platform Admin",
      email,
      passwordHash,
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  console.log(`Admin user ready: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
