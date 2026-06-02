import { NextRequest, NextResponse } from "next/server";
import { getCompetitionData } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const data = await getCompetitionData(id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch tournament matches", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to fetch tournament matches." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as { registrationOpen?: boolean };

    if (typeof body.registrationOpen !== "boolean") {
      return NextResponse.json({ message: "registrationOpen must be true or false." }, { status: 400 });
    }

    await prisma.tournament.update({
      where: { id },
      data: { registrationOpen: body.registrationOpen },
    });

    const data = await getCompetitionData(id);
    return NextResponse.json({ message: body.registrationOpen ? "Registration opened." : "Registration closed.", ...data });
  } catch (error) {
    console.error("Failed to update registration state", error);
    return NextResponse.json({ message: "Failed to update registration state." }, { status: 500 });
  }
}
