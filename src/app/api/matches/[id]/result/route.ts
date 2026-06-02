import { NextRequest, NextResponse } from "next/server";
import { MatchStatus } from "@/generated/prisma/client";
import { updateMatchResult, type UpdateMatchResultBody } from "@/lib/competition";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as UpdateMatchResultBody;
    const validationError = validateBody(body);

    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const data = await updateMatchResult(id, body);
    return NextResponse.json({ message: "Match result updated successfully.", ...data });
  } catch (error) {
    console.error("Failed to update match result", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to update match result." }, { status: 500 });
  }
}

function validateBody(body: UpdateMatchResultBody) {
  const scoreFields = [body.playerOneScore, body.playerTwoScore, body.homeScore, body.awayScore];

  if (scoreFields.some((value) => value !== undefined && (!Number.isInteger(value) || value < 0))) {
    return "Scores must be zero or positive whole numbers.";
  }

  if (body.status && !Object.values(MatchStatus).includes(body.status)) {
    return "Valid match status is required.";
  }

  if (body.scheduledAt !== undefined && body.scheduledAt !== null && Number.isNaN(new Date(body.scheduledAt).getTime())) {
    return "Valid scheduled date is required.";
  }

  return null;
}
