import { NextRequest, NextResponse } from "next/server";
import { type Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Direction = "LEFT" | "CENTER" | "RIGHT";

type ShotResult = {
  shotDirection?: Direction;
  keeperDirection?: Direction;
  goal?: boolean;
};

type NormalizedShot = {
  shotNumber: number;
  roundNumber: number;
  roundType: "TRAINING";
  shotDirection: Direction;
  goalkeeperDirection: Direction;
  keeperDirection: Direction;
  result: "GOAL" | "SAVED";
  goal: boolean;
  takenAt: string;
  error?: string;
};

type TrainingRequest = {
  email?: string;
  shots?: ShotResult[];
};

const directions: Direction[] = ["LEFT", "CENTER", "RIGHT"];

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
    if (!email) return NextResponse.json({ message: "Player email is required." }, { status: 400 });

    const player = await prisma.user.findUnique({ where: { email } });
    if (!player?.passwordHash) return NextResponse.json({ message: "Login with a player account before training." }, { status: 403 });

    const [attempts, bestAttempt, latestAttempt] = await Promise.all([
      prisma.penaltyShootoutTrainingAttempt.count({ where: { userId: player.id } }),
      prisma.penaltyShootoutTrainingAttempt.findFirst({ where: { userId: player.id }, orderBy: [{ score: "desc" }, { createdAt: "asc" }] }),
      prisma.penaltyShootoutTrainingAttempt.findFirst({ where: { userId: player.id }, orderBy: { createdAt: "desc" } }),
    ]);

    return NextResponse.json({
      stats: {
        bestScore: bestAttempt?.score ?? 0,
        totalAttempts: attempts,
        latestAttempt: latestAttempt ? serializeTrainingAttempt(latestAttempt) : null,
      },
    });
  } catch (error) {
    console.error("Failed to load penalty training stats", error);
    return NextResponse.json({ message: "Failed to load penalty training stats." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TrainingRequest;
    const email = body.email?.trim().toLowerCase();
    if (!email) return NextResponse.json({ message: "Player email is required." }, { status: 400 });
    if (!Array.isArray(body.shots) || body.shots.length !== 5) return NextResponse.json({ message: "Training round must contain exactly 5 shots." }, { status: 400 });

    const player = await prisma.user.findUnique({ where: { email } });
    if (!player?.passwordHash) return NextResponse.json({ message: "Login with a player account before training." }, { status: 403 });

    const shots = body.shots.map(normalizeShot);
    const invalidShot = shots.find((shot) => shot.error);
    if (invalidShot?.error) return NextResponse.json({ message: invalidShot.error }, { status: 400 });

    const attempt = await prisma.penaltyShootoutTrainingAttempt.create({
      data: {
        userId: player.id,
        score: shots.filter((shot) => shot.goal).length,
        totalShots: 5,
        shotsJson: shots as Prisma.InputJsonValue,
      },
    });

    const [attempts, bestAttempt] = await Promise.all([
      prisma.penaltyShootoutTrainingAttempt.count({ where: { userId: player.id } }),
      prisma.penaltyShootoutTrainingAttempt.findFirst({ where: { userId: player.id }, orderBy: [{ score: "desc" }, { createdAt: "asc" }] }),
    ]);

    return NextResponse.json({
      message: "Training score saved. This does not affect tournaments, ratings, or achievements.",
      result: serializeTrainingAttempt(attempt),
      stats: {
        bestScore: bestAttempt?.score ?? attempt.score,
        totalAttempts: attempts,
        latestAttempt: serializeTrainingAttempt(attempt),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to save penalty training attempt", error);
    return NextResponse.json({ message: "Failed to save penalty training attempt." }, { status: 500 });
  }
}

function normalizeShot(shot: ShotResult, index: number): NormalizedShot {
  if (!shot.shotDirection || !directions.includes(shot.shotDirection)) return invalidShot(index, `Shot ${index + 1} has an invalid player direction.`);
  if (!shot.keeperDirection || !directions.includes(shot.keeperDirection)) return invalidShot(index, `Shot ${index + 1} has an invalid goalkeeper direction.`);
  const goal = shot.shotDirection !== shot.keeperDirection;
  return {
    shotNumber: index + 1,
    roundNumber: index + 1,
    roundType: "TRAINING",
    shotDirection: shot.shotDirection,
    goalkeeperDirection: shot.keeperDirection,
    keeperDirection: shot.keeperDirection,
    result: goal ? "GOAL" : "SAVED",
    goal,
    takenAt: new Date(Date.now() + index).toISOString(),
  };
}

function invalidShot(index: number, error: string): NormalizedShot {
  return {
    shotNumber: index + 1,
    roundNumber: index + 1,
    roundType: "TRAINING",
    shotDirection: "LEFT",
    goalkeeperDirection: "LEFT",
    keeperDirection: "LEFT",
    result: "SAVED",
    goal: false,
    takenAt: new Date().toISOString(),
    error,
  };
}

function serializeTrainingAttempt(attempt: {
  id: string;
  score: number;
  totalShots: number;
  shotsJson: Prisma.JsonValue;
  createdAt: Date;
}) {
  return {
    id: attempt.id,
    score: attempt.score,
    totalShots: attempt.totalShots,
    shots: attempt.shotsJson,
    createdAt: attempt.createdAt.toISOString(),
  };
}
