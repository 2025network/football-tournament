import { NextRequest, NextResponse } from "next/server";
import { NotificationType, ResultSubmissionStatus } from "@/generated/prisma/client";
import { getCompetitionData, updateMatchResult } from "@/lib/competition";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type UpdateSubmissionBody = {
  status?: ResultSubmissionStatus;
  adminNote?: string;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as UpdateSubmissionBody;

    if (!body.status || !Object.values(ResultSubmissionStatus).includes(body.status)) {
      return NextResponse.json({ message: "Valid submission status is required." }, { status: 400 });
    }

    const submission = await prisma.matchResultSubmission.findUnique({
      where: { id },
      include: { match: true, registration: { include: { user: true } } },
    });

    if (!submission) {
      return NextResponse.json({ message: "Result submission not found." }, { status: 404 });
    }

    const updatedSubmission = await prisma.matchResultSubmission.update({
      where: { id },
      data: {
        status: body.status,
        adminNote: body.adminNote?.trim() || null,
      },
      include: { registration: { include: { user: true } } },
    });

    if (body.status === ResultSubmissionStatus.APPROVED) {
      await createNotification({
        userId: submission.registration.userId,
        title: "Result submission approved",
        message: "Your submitted match result has been approved by admin.",
        type: NotificationType.RESULT,
      });
      const parsedScore = parseSubmittedScore(submission.submittedScore);

      if (!parsedScore) {
        return NextResponse.json({ message: "Submitted score must look like 2-1 or 2:1 before approval." }, { status: 400 });
      }

      const competitionData = await updateMatchResult(submission.matchId, {
        homeScore: parsedScore.homeScore,
        awayScore: parsedScore.awayScore,
      });

      return NextResponse.json({
        message: "Submission approved and match result updated.",
        submission: serializeSubmission(updatedSubmission),
        ...competitionData,
      });
    }

    if (body.status === ResultSubmissionStatus.REJECTED) {
      await createNotification({
        userId: submission.registration.userId,
        title: "Result submission rejected",
        message: body.adminNote?.trim() || "Your submitted match result was rejected by admin.",
        type: NotificationType.RESULT,
      });
    }

    const competitionData = await getCompetitionData(submission.match.tournamentId);

    return NextResponse.json({
      message: body.status === ResultSubmissionStatus.REJECTED ? "Submission rejected." : "Submission updated.",
      submission: serializeSubmission(updatedSubmission),
      ...competitionData,
    });
  } catch (error) {
    console.error("Failed to update result submission", error);
    return NextResponse.json({ message: "Failed to update result submission." }, { status: 500 });
  }
}

function parseSubmittedScore(score: string) {
  const match = score.trim().match(/^(\d+)\s*[-:]\s*(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    homeScore: Number(match[1]),
    awayScore: Number(match[2]),
  };
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
