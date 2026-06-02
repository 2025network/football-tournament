import { NextRequest, NextResponse } from "next/server";
import { ensureTournamentAutomationSetting } from "@/lib/tournament-automation";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type AutomationBody = {
  autoApprovePaidPlayers?: boolean;
  autoCloseRegistration?: boolean;
  autoGenerateFixtures?: boolean;
  autoNotifyPlayers?: boolean;
  autoFeatureFinals?: boolean;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id }, select: { id: true, title: true } });
    if (!tournament) return NextResponse.json({ message: "Tournament not found." }, { status: 404 });

    const setting = await ensureTournamentAutomationSetting(id);
    return NextResponse.json({ tournament, setting });
  } catch (error) {
    console.error("Failed to load automation settings", error);
    return NextResponse.json({ message: "Failed to load automation settings." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as AutomationBody;
    const tournament = await prisma.tournament.findUnique({ where: { id }, select: { id: true, title: true } });
    if (!tournament) return NextResponse.json({ message: "Tournament not found." }, { status: 404 });

    await ensureTournamentAutomationSetting(id);
    const setting = await prisma.tournamentAutomationSetting.update({
      where: { tournamentId: id },
      data: {
        autoApprovePaidPlayers: Boolean(body.autoApprovePaidPlayers),
        autoCloseRegistration: Boolean(body.autoCloseRegistration),
        autoGenerateFixtures: Boolean(body.autoGenerateFixtures),
        autoNotifyPlayers: body.autoNotifyPlayers ?? true,
        autoFeatureFinals: Boolean(body.autoFeatureFinals),
      },
    });

    return NextResponse.json({ message: "Automation settings saved.", tournament, setting });
  } catch (error) {
    console.error("Failed to save automation settings", error);
    return NextResponse.json({ message: "Failed to save automation settings." }, { status: 500 });
  }
}