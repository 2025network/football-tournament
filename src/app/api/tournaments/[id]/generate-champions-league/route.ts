import { NextRequest, NextResponse } from "next/server";
import { generateChampionsLeague } from "@/lib/competition";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const data = await generateChampionsLeague(id);
    return NextResponse.json({ message: "Group Stage fixtures generated successfully.", ...data });
  } catch (error) {
    console.error("Failed to generate Group Stage fixtures", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to generate Group Stage fixtures." }, { status: 400 });
  }
}
