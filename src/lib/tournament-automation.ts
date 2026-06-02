import { ApprovalStatus, CompetitionFormat, NotificationType, PaymentStatus, TournamentStatus } from "@/generated/prisma/client";
import { generateChampionsLeague, generateKnockout, generateLeague } from "@/lib/competition";
import { notifyRegistrations } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function ensureTournamentAutomationSetting(tournamentId: string) {
  return prisma.tournamentAutomationSetting.upsert({
    where: { tournamentId },
    update: {},
    create: { tournamentId },
  });
}

export async function runTournamentAutomation(tournamentId: string) {
  const setting = await ensureTournamentAutomationSetting(tournamentId);
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });

  if (!tournament) {
    throw new Error("Tournament not found.");
  }

  const actions: string[] = [];

  if (setting.autoApprovePaidPlayers) {
    const paidPending = await prisma.registration.findMany({
      where: { tournamentId, paymentStatus: PaymentStatus.PAID, approvalStatus: ApprovalStatus.PENDING },
      select: { id: true },
    });

    if (paidPending.length > 0) {
      const registrationIds = paidPending.map((registration) => registration.id);
      await prisma.registration.updateMany({
        where: { id: { in: registrationIds } },
        data: { approvalStatus: ApprovalStatus.APPROVED },
      });
      await notifyRegistrations(registrationIds, "Registration approved", "Your paid tournament registration has been approved automatically.", NotificationType.APPROVAL);
      actions.push(`Approved ${paidPending.length} paid registration(s).`);
    }
  }

  if (setting.autoCloseRegistration && tournament.registrationOpen && tournament.startDate <= new Date()) {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { registrationOpen: false, status: TournamentStatus.CLOSED },
    });
    actions.push("Closed registration because the start date has arrived.");
  }

  const refreshedTournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  const matchCount = await prisma.match.count({ where: { tournamentId } });
  let fixturesGenerated = false;

  if (setting.autoGenerateFixtures && refreshedTournament && !refreshedTournament.registrationOpen && matchCount === 0) {
    if (refreshedTournament.competitionFormat === CompetitionFormat.LEAGUE) {
      await generateLeague(tournamentId, { notifyPlayers: setting.autoNotifyPlayers });
    } else if (refreshedTournament.competitionFormat === CompetitionFormat.CHAMPIONS_LEAGUE) {
      await generateChampionsLeague(tournamentId, { notifyPlayers: setting.autoNotifyPlayers });
    } else {
      await generateKnockout(tournamentId, { notifyPlayers: setting.autoNotifyPlayers });
    }

    fixturesGenerated = true;
    actions.push("Generated fixtures.");
    if (setting.autoNotifyPlayers) actions.push("Notified players about generated fixtures.");
  }

  if (setting.autoFeatureFinals) {
    const maxRound = await prisma.match.aggregate({ where: { tournamentId }, _max: { round: true } });
    const finalRound = maxRound._max.round;

    if (finalRound !== null) {
      const rounds = finalRound > 1 ? [finalRound, finalRound - 1] : [finalRound];
      const updated = await prisma.match.updateMany({
        where: { tournamentId, round: { in: rounds } },
        data: { featuredLive: true },
      });

      if (updated.count > 0) {
        actions.push(`Featured ${updated.count} semifinal/final match(es) for livestream.`);
      }
    }
  }

  return {
    setting,
    actions,
    fixturesGenerated,
    message: actions.length > 0 ? "Automation completed." : "Automation ran, but no actions were needed.",
  };
}

export async function autoApproveRegistrationAfterPaid(registrationId: string) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { tournament: { include: { automationSetting: true } } },
  });

  if (!registration?.tournament.automationSetting?.autoApprovePaidPlayers) {
    return null;
  }

  if (registration.paymentStatus !== PaymentStatus.PAID || registration.approvalStatus !== ApprovalStatus.PENDING) {
    return null;
  }

  const updated = await prisma.registration.update({
    where: { id: registrationId },
    data: { approvalStatus: ApprovalStatus.APPROVED },
  });

  await notifyRegistrations([registrationId], "Registration approved", "Your paid tournament registration has been approved automatically.", NotificationType.APPROVAL);
  return updated;
}