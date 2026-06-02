import { NextRequest, NextResponse } from "next/server";
import { generateLeague } from "@/lib/competition";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const data = await generateLeague(id);
    return NextResponse.json({ message: "League fixtures generated successfully.", ...data });
  } catch (error) {
    console.error("Failed to generate league", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to generate league fixtures." }, { status: 400 });
  }
}
