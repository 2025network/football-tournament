import { NextRequest, NextResponse } from "next/server";
import { generateChampionsLeague } from "@/lib/competition";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const data = await generateChampionsLeague(id);
    return NextResponse.json({ message: "Champions League groups generated successfully.", ...data });
  } catch (error) {
    console.error("Failed to generate Champions League", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to generate Champions League groups." }, { status: 400 });
  }
}
