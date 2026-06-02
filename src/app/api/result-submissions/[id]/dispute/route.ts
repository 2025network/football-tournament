import { NextRequest, NextResponse } from "next/server";
import { MatchStatus, NotificationType, ResultSubmissionStatus, Role } from "@/generated/prisma/client";
import { getCompetitionData } from "@/lib/competition";
import { createNotification, notifyRegistrations } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };
type DisputeBody = { registrationId?: string; opponentNote?: string };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as DisputeBody;
    const disputerRegistrationId = body.registrationId?.trim();
    const opponentNote = body.opponentNote?.trim() || null;

    if (!disputerRegistrationId) {
      return NextResponse.json({ message: "Disputing player registration ID is required." }, { status: 400 });
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

    if (submission.registrationId === disputerRegistrationId) {
      return NextResponse.json({ message: "You cannot dispute your own result submission." }, { status: 400 });
    }

    if (!getMatchRegistrationIds(submission.match).includes(disputerRegistrationId)) {
      return NextResponse.json({ message: "Only the opponent in this match can dispute this result." }, { status: 403 });
    }

    const updatedSubmission = await prisma.matchResultSubmission.update({
      where: { id },
      data: {
        opponentConfirmed: false,
        opponentDisputed: true,
        opponentNote,
        autoApproved: false,
        status: ResultSubmissionStatus.PENDING,
      },
      include: { registration: { include: { user: true } } },
    });

    await prisma.match.update({
      where: { id: submission.matchId },
      data: { status: MatchStatus.DISPUTED },
    });

    await notifyRegistrations(getMatchRegistrationIds(submission.match), "Result disputed", opponentNote || "A player disputed the submitted match result. Admin will review it.", NotificationType.RESULT);

    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN }, select: { id: true } });
    await Promise.all(admins.map((admin) => createNotification({ userId: admin.id, title: "Result dispute needs review", message: `A result submission for score ${submission.submittedScore} was disputed.`, type: NotificationType.RESULT })));

    const competitionData = await getCompetitionData(submission.match.tournamentId);

    return NextResponse.json({
      message: "Result disputed. Admin will review it.",
      submission: serializeSubmission(updatedSubmission),
      ...competitionData,
    });
  } catch (error) {
    console.error("Failed to dispute result submission", error);
    return NextResponse.json({ message: "Failed to dispute result submission." }, { status: 500 });
  }
}

function getMatchRegistrationIds(match: { playerOneRegistrationId: string | null; playerTwoRegistrationId: string | null; homeRegistrationId: string | null; awayRegistrationId: string | null }) {
  return Array.from(new Set([match.playerOneRegistrationId, match.playerTwoRegistrationId, match.homeRegistrationId, match.awayRegistrationId].filter(Boolean))) as string[];
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