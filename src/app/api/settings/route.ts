import { NextRequest, NextResponse } from "next/server";
import { getSettings, getSettingsMap, updateSettings } from "@/lib/settings";

export async function GET() {
  try {
    const settings = await getSettings();
    const values = await getSettingsMap();
    return NextResponse.json({ settings, values });
  } catch (error) {
    console.error("Failed to load settings", error);
    return NextResponse.json({ message: "Failed to load settings." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { settings?: Record<string, string> };
    const settings = await updateSettings(body.settings ?? {});
    return NextResponse.json({ message: "Settings updated.", settings });
  } catch (error) {
    console.error("Failed to update settings", error);
    return NextResponse.json({ message: "Failed to update settings." }, { status: 500 });
  }
}