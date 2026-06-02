import { NextRequest, NextResponse } from "next/server";
import { MatchStatus, NotificationType, ResultSubmissionStatus } from "@/generated/prisma/client";
import { updateMatchResult } from "@/lib/competition";
import { notifyRegistrations } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };
type ConfirmBody = { registrationId?: string };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as ConfirmBody;
    const confirmerRegistrationId = body.registrationId?.trim();

    if (!confirmerRegistrationId) {
      return NextResponse.json({ message: "Confirming player registration ID is required." }, { status: 400 });
    }

    const submission = await prisma.matchResultSubmission.findUnique({
      where: { id },
      include: {
        match: true,
        registration: { include: { user: true } },
      },
    });

    if (!submission) {
      return NextResponse.json({ message: "Result submission not found." }, { status: 404 });
    }

    if (submission.registrationId === confirmerRegistrationId) {
      return NextResponse.json({ message: "You cannot confirm your own result submission." }, { status: 400 });
    }

    if (!getMatchRegistrationIds(submission.match).includes(confirmerRegistrationId)) {
      return NextResponse.json({ message: "Only the opponent in this match can confirm this result." }, { status: 403 });
    }

    const parsedScore = parseSubmittedScore(submission.submittedScore);
    if (!parsedScore) {
      return NextResponse.json({ message: "Submitted score must look like 2-1 or 2:1 before confirmation." }, { status: 400 });
    }

    const updatedSubmission = await prisma.matchResultSubmission.update({
      where: { id },
      data: {
        opponentConfirmed: true,
        opponentDisputed: false,
        opponentNote: null,
        autoApproved: true,
        status: ResultSubmissionStatus.APPROVED,
      },
      include: { registration: { include: { user: true } } },
    });

    const competitionData = await updateMatchResult(submission.matchId, {
      homeScore: parsedScore.homeScore,
      awayScore: parsedScore.awayScore,
      status: MatchStatus.COMPLETED,
    });

    await notifyRegistrations(getMatchRegistrationIds(submission.match), "Result confirmed", "Both players confirmed the match score. The result has been approved automatically.", NotificationType.RESULT);

    return NextResponse.json({
      message: "Result confirmed and approved automatically.",
      submission: serializeSubmission(updatedSubmission),
      ...competitionData,
    });
  } catch (error) {
    console.error("Failed to confirm result submission", error);
    return NextResponse.json({ message: "Failed to confirm result submission." }, { status: 500 });
  }
}

function getMatchRegistrationIds(match: { playerOneRegistrationId: string | null; playerTwoRegistrationId: string | null; homeRegistrationId: string | null; awayRegistrationId: string | null }) {
  return Array.from(new Set([match.playerOneRegistrationId, match.playerTwoRegistrationId, match.homeRegistrationId, match.awayRegistrationId].filter(Boolean))) as string[];
}

function parseSubmittedScore(score: string) {
  const match = score.trim().match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (!match) return null;
  return { homeScore: Number(match[1]), awayScore: Number(match[2]) };
}

function serializeSubmission(submission: { id: string; matchId: string; registrationId: string; submittedScore: string; screenshotUrl: string | null; note: string | null; status: ResultSubmissionStatus; adminNote: string | null; opponentConfirmed: boolean; opponentDisputed: boolean; opponentNote: string | null; autoApproved: boolean; createdAt: Date; registration: { user: { fullName: string } } }) {
  return {
    id: submission.id,
    matchId: submission.matchId,
    registrationId: submission.registrationId,
    playerName: submission.registration.user.fullName,
    submittedScore: submission.submittedScore,
    screenshotUrl: submission.screenshotUrl,
    note: submission.note,
    status: submission.status,
    adminNote: submission.adminNote,
    opponentConfirmed: submission.opponentConfirmed,
    opponentDisputed: submission.opponentDisputed,
    opponentNote: submission.opponentNote,
    autoApproved: submission.autoApproved,
    createdAt: submission.createdAt.toISOString(),
  };
}