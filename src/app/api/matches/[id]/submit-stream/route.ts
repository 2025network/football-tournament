import { NextRequest, NextResponse } from "next/server";
import { MatchStreamMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type SubmitStreamBody = {
  registrationId?: string;
  playerStreamUrl?: string;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as SubmitStreamBody;
    const registrationId = body.registrationId?.trim();
    const playerStreamUrl = body.playerStreamUrl?.trim();

    if (!registrationId) {
      return NextResponse.json({ message: "Registration ID is required." }, { status: 400 });
    }

    if (!playerStreamUrl) {
      return NextResponse.json({ message: "Player stream URL is required." }, { status: 400 });
    }

    if (!isValidStreamUrl(playerStreamUrl)) {
      return NextResponse.json({ message: "Enter a valid YouTube, TikTok, Twitch, Facebook, or external stream URL." }, { status: 400 });
    }

    const match = await prisma.match.findUnique({ where: { id } });

    if (!match) {
      return NextResponse.json({ message: "Match not found." }, { status: 404 });
    }

    if (match.streamMode !== MatchStreamMode.PLAYER_STREAM) {
      return NextResponse.json({ message: "Player stream submission is not enabled for this match." }, { status: 400 });
    }

    const isMatchPlayer = [
      match.playerOneRegistrationId,
      match.playerTwoRegistrationId,
      match.homeRegistrationId,
      match.awayRegistrationId,
    ].includes(registrationId);

    if (!isMatchPlayer) {
      return NextResponse.json({ message: "This player is not assigned to this match." }, { status: 403 });
    }

    const updated = await prisma.match.update({
      where: { id },
      data: { playerStreamUrl },
    });

    return NextResponse.json({
      message: "Player stream link submitted successfully.",
      match: {
        id: updated.id,
        streamMode: updated.streamMode,
        playerStreamUrl: updated.playerStreamUrl,
      },
    });
  } catch (error) {
    console.error("Failed to submit player stream", error);
    return NextResponse.json({ message: "Failed to submit player stream." }, { status: 500 });
  }
}

function isValidStreamUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}