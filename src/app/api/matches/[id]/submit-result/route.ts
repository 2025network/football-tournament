import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const formData = await request.formData();
    const registrationId = String(formData.get("registrationId") ?? "").trim();
    const submittedScore = String(formData.get("submittedScore") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    const screenshot = formData.get("screenshot");

    if (!registrationId) {
      return NextResponse.json({ message: "Registration ID is required." }, { status: 400 });
    }

    if (!submittedScore) {
      return NextResponse.json({ message: "Submitted score is required." }, { status: 400 });
    }

    const match = await prisma.match.findUnique({ where: { id } });

    if (!match) {
      return NextResponse.json({ message: "Match not found." }, { status: 404 });
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

    const screenshotUrl = screenshot instanceof File && screenshot.size > 0
      ? await saveScreenshot(screenshot)
      : null;

    const submission = await prisma.matchResultSubmission.create({
      data: {
        matchId: id,
        registrationId,
        submittedScore,
        screenshotUrl,
        note: note || null,
      },
      include: {
        registration: { include: { user: true } },
      },
    });

    return NextResponse.json({
      message: "Match result submitted for admin review.",
      submission: serializeSubmission(submission),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to submit match result", error);
    return NextResponse.json({ message: "Failed to submit match result." }, { status: 500 });
  }
}

async function saveScreenshot(file: File) {
  const uploadDirectory = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDirectory, { recursive: true });

  const extension = getSafeExtension(file.name);
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const filePath = path.join(uploadDirectory, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, bytes);

  return `/uploads/${fileName}`;
}

function getSafeExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp"].includes(extension) ? extension : ".png";
}

function serializeSubmission(submission: { id: string; matchId: string; registrationId: string; submittedScore: string; screenshotUrl: string | null; note: string | null; status: string; adminNote: string | null; createdAt: Date; registration: { user: { fullName: string } } }) {
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
    createdAt: submission.createdAt.toISOString(),
  };
}
