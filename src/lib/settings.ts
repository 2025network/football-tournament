import { WebsiteSettingType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type SettingDefinition = {
  key: string;
  label: string;
  value: string;
  type: WebsiteSettingType;
  group: "Brand" | "Homepage" | "Contact" | "Payments" | "Rules" | "Footer";
};

export const defaultSettings: SettingDefinition[] = [
  { key: "site_name", label: "Site name", value: "football-tournament", type: WebsiteSettingType.TEXT, group: "Brand" },
  { key: "homepage_hero_title", label: "Homepage hero title", value: "Build your squad. Enter the arena. Win the prize.", type: WebsiteSettingType.TEXT, group: "Homepage" },
  { key: "homepage_hero_subtitle", label: "Homepage hero subtitle", value: "A professional esports tournament platform for eFootball Mobile, PUBG Mobile, COD Mobile, and Free Fire players.", type: WebsiteSettingType.LONG_TEXT, group: "Homepage" },
  { key: "homepage_cta_text", label: "Homepage call-to-action text", value: "Register Tournament", type: WebsiteSettingType.TEXT, group: "Homepage" },
  { key: "whatsapp_contact_link", label: "WhatsApp contact link", value: "https://wa.me/2340000000000", type: WebsiteSettingType.URL, group: "Contact" },
  { key: "support_email", label: "Support email", value: "support@example.com", type: WebsiteSettingType.TEXT, group: "Contact" },
  { key: "bank_name", label: "Bank name", value: "YOUR BANK NAME", type: WebsiteSettingType.TEXT, group: "Payments" },
  { key: "account_name", label: "Account name", value: "YOUR BUSINESS NAME", type: WebsiteSettingType.TEXT, group: "Payments" },
  { key: "account_number", label: "Account number", value: "YOUR ACCOUNT NUMBER", type: WebsiteSettingType.TEXT, group: "Payments" },
  { key: "tournament_rules_text", label: "Tournament rules text", value: "Respect all opponents. Submit results with proof. Admin decisions are final during disputes.", type: WebsiteSettingType.LONG_TEXT, group: "Rules" },
  { key: "faq_text", label: "FAQ text", value: "Q: How do I register?\nA: Create a player account, choose a tournament, and submit your registration.\n\nQ: How are payments confirmed?\nA: Pay online or upload bank transfer proof for admin review.", type: WebsiteSettingType.LONG_TEXT, group: "Rules" },
  { key: "footer_social_links", label: "Footer social links", value: "[{\"label\":\"Instagram\",\"href\":\"#\"},{\"label\":\"X\",\"href\":\"#\"},{\"label\":\"Discord\",\"href\":\"#\"},{\"label\":\"YouTube\",\"href\":\"#\"}]", type: WebsiteSettingType.JSON, group: "Footer" },
];

export type SettingsMap = Record<string, string>;

export async function ensureDefaultSettings() {
  await Promise.all(
    defaultSettings.map((setting) =>
      prisma.websiteSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: { key: setting.key, value: setting.value, type: setting.type },
      }),
    ),
  );
}

export async function getSettings() {
  await ensureDefaultSettings();
  const settings = await prisma.websiteSetting.findMany({ orderBy: { key: "asc" } });
  const definitions = new Map(defaultSettings.map((setting) => [setting.key, setting]));

  return settings.map((setting) => ({
    id: setting.id,
    key: setting.key,
    label: definitions.get(setting.key)?.label ?? setting.key,
    group: definitions.get(setting.key)?.group ?? "Brand",
    value: setting.value,
    type: setting.type,
    updatedAt: setting.updatedAt.toISOString(),
  }));
}

export async function getSettingsMap(): Promise<SettingsMap> {
  const settings = await getSettings();
  return settings.reduce<SettingsMap>((map, setting) => {
    map[setting.key] = setting.value;
    return map;
  }, {});
}

export async function updateSettings(values: Record<string, string>) {
  await ensureDefaultSettings();
  const definitions = new Map(defaultSettings.map((setting) => [setting.key, setting]));
  const allowedKeys = new Set(defaultSettings.map((setting) => setting.key));

  await Promise.all(
    Object.entries(values)
      .filter(([key]) => allowedKeys.has(key))
      .map(([key, value]) =>
        prisma.websiteSetting.upsert({
          where: { key },
          update: { value: String(value ?? ""), type: definitions.get(key)?.type ?? WebsiteSettingType.TEXT },
          create: { key, value: String(value ?? ""), type: definitions.get(key)?.type ?? WebsiteSettingType.TEXT },
        }),
      ),
  );

  return getSettings();
}

export function parseSocialLinks(value: string | undefined) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as Array<{ label?: string; href?: string }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((link) => ({ label: String(link.label ?? "").trim(), href: String(link.href ?? "").trim() }))
      .filter((link) => link.label && link.href);
  } catch {
    return [];
  }
}

export function rulesTextToList(value: string | undefined) {
  return String(value ?? "")
    .split(/\r?\n|\./)
    .map((rule) => rule.trim())
    .filter(Boolean);
}