import { NextRequest, NextResponse } from "next/server";
import { generateKnockout } from "@/lib/competition";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const data = await generateKnockout(id);
    return NextResponse.json({ message: "Knockout matches generated successfully.", ...data });
  } catch (error) {
    console.error("Failed to generate knockout", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to generate knockout matches." }, { status: 400 });
  }
}
