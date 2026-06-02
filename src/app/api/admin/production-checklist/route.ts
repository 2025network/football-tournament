import { access } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";

type CheckStatus = "pass" | "warning" | "fail";

type ProductionCheck = {
  key: string;
  label: string;
  status: CheckStatus;
  configured: boolean;
  message: string;
  category: "Database" | "Environment" | "Payments" | "Uploads" | "Build" | "Security";
};

const placeholderValues = new Set(["YOUR BANK NAME", "YOUR BUSINESS NAME", "YOUR ACCOUNT NUMBER"]);

export async function GET() {
  const checks: ProductionCheck[] = [];
  let databaseConnected = false;
  let settings: Record<string, string> = {};
  let adminUserCount = 0;

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseConnected = true;
  } catch (error) {
    console.error("Production checklist database check failed", error);
  }

  checks.push({
    key: "database_connection",
    label: "Database connection status",
    status: databaseConnected ? "pass" : "fail",
    configured: databaseConnected,
    message: databaseConnected ? "PostgreSQL is reachable." : "PostgreSQL is not reachable. Check DATABASE_URL and database server status.",
    category: "Database",
  });

  if (databaseConnected) {
    try {
      settings = await getSettingsMap();
      adminUserCount = await prisma.user.count({ where: { role: Role.ADMIN } });
    } catch (error) {
      console.error("Production checklist settings check failed", error);
    }
  }

  checks.push(envCheck("DATABASE_URL", "DATABASE_URL", "Database connection string is configured.", "Add DATABASE_URL to .env or your production environment."));
  checks.push(envCheck("ADMIN_EMAIL", "ADMIN_EMAIL", "Admin email is configured.", "Add ADMIN_EMAIL to protect admin access."));
  checks.push(envCheck("ADMIN_PASSWORD", "ADMIN_PASSWORD", "Admin seed password is configured.", "Add ADMIN_PASSWORD before running npm run admin:create."));
  checks.push({
    key: "database_admin_user",
    label: "Database admin user",
    status: adminUserCount > 0 ? "pass" : "fail",
    configured: adminUserCount > 0,
    message: adminUserCount > 0 ? `${adminUserCount} ADMIN user account exists in the database.` : "No ADMIN user exists yet. Run npm run admin:create after setting ADMIN_EMAIL and ADMIN_PASSWORD.",
    category: "Security",
  });
  checks.push(envCheck("PAYSTACK_SECRET_KEY", "PAYSTACK_SECRET_KEY", "Paystack secret key is configured.", "Add PAYSTACK_SECRET_KEY for live payment verification.", "Payments"));
  checks.push(envCheck("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY", "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY", "Paystack public key is configured.", "Add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY for frontend payments.", "Payments"));
  checks.push(envCheck("NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_APP_URL", "Production app URL is configured.", "Add NEXT_PUBLIC_APP_URL, for example https://yourdomain.com."));

  checks.push(settingCheck("bank_name", "Bank name setting", settings.bank_name, "Bank name is configured.", "Set a real bank name in Admin Settings."));
  checks.push(settingCheck("account_name", "Account name setting", settings.account_name, "Account name is configured.", "Set your real bank account name in Admin Settings."));
  checks.push(settingCheck("account_number", "Account number setting", settings.account_number, "Account number is configured.", "Set your real bank account number in Admin Settings."));

  checks.push(await folderCheck("public_uploads", "public/uploads folder", path.join(process.cwd(), "public", "uploads")));
  checks.push(await folderCheck("payment_receipts_uploads", "public/uploads/payment-receipts folder", path.join(process.cwd(), "public", "uploads", "payment-receipts")));

  const requiredForBuild = ["DATABASE_URL", "NEXT_PUBLIC_APP_URL"];
  const buildReady = requiredForBuild.every((key) => hasValue(process.env[key])) && databaseConnected;
  checks.push({
    key: "build_readiness",
    label: "Build readiness",
    status: buildReady ? "pass" : "warning",
    configured: buildReady,
    message: buildReady ? "Core deployment requirements are present. Run npm run build before deploying." : "Some core settings are missing. Fix warnings, then run npm run build.",
    category: "Build",
  });

  checks.push(...securityChecks());

  const summary = checks.reduce(
    (next, check) => {
      next[check.status] += 1;
      return next;
    },
    { pass: 0, warning: 0, fail: 0 },
  );

  return NextResponse.json({ checks, summary, generatedAt: new Date().toISOString() });
}

function envCheck(key: string, label: string, successMessage: string, missingMessage: string, category: ProductionCheck["category"] = "Environment"): ProductionCheck {
  const configured = hasValue(process.env[key]);
  return {
    key,
    label,
    status: configured ? "pass" : "fail",
    configured,
    message: configured ? successMessage : missingMessage,
    category,
  };
}

function settingCheck(key: string, label: string, value: string | undefined, successMessage: string, missingMessage: string): ProductionCheck {
  const cleanValue = String(value ?? "").trim();
  const configured = hasValue(cleanValue) && !placeholderValues.has(cleanValue.toUpperCase());
  return {
    key,
    label,
    status: configured ? "pass" : "warning",
    configured,
    message: configured ? successMessage : missingMessage,
    category: "Payments",
  };
}

async function folderCheck(key: string, label: string, folderPath: string): Promise<ProductionCheck> {
  try {
    await access(folderPath);
    return { key, label, status: "pass", configured: true, message: "Folder is available for uploads.", category: "Uploads" };
  } catch {
    return { key, label, status: "fail", configured: false, message: "Folder is missing. Create it before accepting uploads.", category: "Uploads" };
  }
}

function securityChecks(): ProductionCheck[] {
  const adminPassword = String(process.env.ADMIN_PASSWORD ?? "").trim();
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL ?? "").trim();

  return [
    {
      key: "admin_password_strength",
      label: "Admin password strength",
      status: adminPassword.length >= 10 && adminPassword !== "change-this-password" ? "pass" : "warning",
      configured: adminPassword.length >= 10 && adminPassword !== "change-this-password",
      message: adminPassword.length >= 10 && adminPassword !== "change-this-password" ? "Admin password is not the default placeholder." : "Use a strong admin password before production.",
      category: "Security",
    },
    {
      key: "https_app_url",
      label: "HTTPS app URL",
      status: appUrl.startsWith("https://") ? "pass" : "warning",
      configured: appUrl.startsWith("https://"),
      message: appUrl.startsWith("https://") ? "App URL uses HTTPS." : "Production NEXT_PUBLIC_APP_URL should use HTTPS.",
      category: "Security",
    },
    {
      key: "temporary_auth_warning",
      label: "Temporary auth warning",
      status: "warning",
      configured: false,
      message: "Admin and player sessions still use browser storage. Replace with secure cookie/JWT auth before serious public launch.",
      category: "Security",
    },
  ];
}

function hasValue(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

