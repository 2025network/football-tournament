import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const submissions = await prisma.matchResultSubmission.findMany({
      where: { matchId: id },
      include: { registration: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      submissions: submissions.map((submission) => ({
        id: submission.id,
        matchId: submission.matchId,
        registrationId: submission.registrationId,
        playerName: submission.registration.user.fullName,
        submittedScore: submission.submittedScore,
        screenshotUrl: submission.screenshotUrl,
        note: submission.note,
        status: submission.status,
        adminNote: submission.adminNote,
        createdAt: submission.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch match submissions", error);
    return NextResponse.json({ message: "Failed to fetch match submissions." }, { status: 500 });
  }
}
