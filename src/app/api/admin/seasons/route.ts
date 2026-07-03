import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SeasonBody = {
  id?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  active?: boolean;
};

export async function GET() {
  try {
    const seasons = await prisma.season.findMany({
      include: { _count: { select: { ratings: true } } },
      orderBy: [{ active: "desc" }, { startDate: "desc" }],
    });

    return NextResponse.json({
      seasons: seasons.map((season) => ({
        id: season.id,
        name: season.name,
        startDate: season.startDate.toISOString(),
        endDate: season.endDate.toISOString(),
        active: season.active,
        ratedPlayers: season._count.ratings,
      })),
    });
  } catch (error) {
    console.error("Failed to load seasons", error);
    return NextResponse.json({ message: "Failed to load seasons." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SeasonBody;
    const validationError = validateSeason(body);
    if (validationError) return NextResponse.json({ message: validationError }, { status: 400 });

    const season = await prisma.$transaction(async (tx) => {
      if (body.active) {
        await tx.season.updateMany({ where: { active: true }, data: { active: false } });
      }

      return tx.season.create({
        data: {
          name: body.name!.trim(),
          startDate: new Date(body.startDate!),
          endDate: new Date(body.endDate!),
          active: Boolean(body.active),
        },
      });
    });

    return NextResponse.json({ season, message: "Season created successfully." }, { status: 201 });
  } catch (error) {
    console.error("Failed to create season", error);
    return NextResponse.json({ message: "Failed to create season." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as SeasonBody;
    if (!body.id) return NextResponse.json({ message: "Season ID is required." }, { status: 400 });

    const existing = await prisma.season.findUnique({ where: { id: body.id } });
    if (!existing) return NextResponse.json({ message: "Season not found." }, { status: 404 });

    const season = await prisma.$transaction(async (tx) => {
      if (body.active) {
        await tx.season.updateMany({ where: { active: true, NOT: { id: body.id } }, data: { active: false } });
      }

      return tx.season.update({
        where: { id: body.id },
        data: {
          name: body.name?.trim() || existing.name,
          startDate: body.startDate ? new Date(body.startDate) : existing.startDate,
          endDate: body.endDate ? new Date(body.endDate) : existing.endDate,
          active: typeof body.active === "boolean" ? body.active : existing.active,
        },
      });
    });

    return NextResponse.json({ season, message: "Season updated successfully." });
  } catch (error) {
    console.error("Failed to update season", error);
    return NextResponse.json({ message: "Failed to update season." }, { status: 500 });
  }
}

function validateSeason(body: SeasonBody) {
  if (!body.name?.trim()) return "Season name is required.";
  if (!body.startDate) return "Start date is required.";
  if (!body.endDate) return "End date is required.";

  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return "Valid start and end dates are required.";
  if (endDate <= startDate) return "End date must be after start date.";

  return null;
}
