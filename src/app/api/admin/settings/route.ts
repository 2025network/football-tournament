import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/settings";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to load admin settings", error);
    return NextResponse.json({ message: "Failed to load admin settings." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { settings?: Record<string, string> };
    const settings = await updateSettings(body.settings ?? {});
    return NextResponse.json({ message: "Settings updated.", settings });
  } catch (error) {
    console.error("Failed to update admin settings", error);
    return NextResponse.json({ message: "Failed to update admin settings." }, { status: 500 });
  }
}