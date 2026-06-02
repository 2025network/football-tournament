import { NextResponse } from "next/server";
import { runTournamentAutomation } from "@/lib/tournament-automation";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const result = await runTournamentAutomation(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to run tournament automation", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to run tournament automation." }, { status: 500 });
  }
}