import { NotificationType, PaymentRecordStatus, PaymentStatus, Prisma } from "@/generated/prisma/client";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { autoApproveRegistrationAfterPaid } from "@/lib/tournament-automation";

export const paymentInclude = {
  registration: {
    include: {
      user: true,
      tournament: true,
    },
  },
} as const;

export type PaymentWithRegistration = Prisma.PaymentGetPayload<{
  include: typeof paymentInclude;
}>;

export function serializePayment(payment: PaymentWithRegistration) {
  return {
    id: payment.id,
    registrationId: payment.registrationId,
    playerName: payment.registration.user.fullName,
    playerEmail: payment.registration.user.email,
    tournamentId: payment.registration.tournament.id,
    tournamentTitle: payment.registration.tournament.title,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    provider: payment.provider,
    reference: payment.reference,
    receiptUrl: payment.receiptUrl,
    senderName: payment.senderName,
    senderBank: payment.senderBank,
    transferNote: payment.transferNote,
    status: payment.status,
    providerResponse: payment.providerResponse,
    adminNote: payment.adminNote,
    registrationPaymentStatus: payment.registration.paymentStatus,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export async function markPaymentSuccess(paymentId: string, adminNote?: string) {
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentRecordStatus.SUCCESS,
      adminNote: adminNote?.trim() || undefined,
      registration: {
        update: { paymentStatus: PaymentStatus.PAID },
      },
    },
    include: paymentInclude,
  });

  await createNotification({
    userId: payment.registration.user.id,
    title: "Payment confirmed",
    message: `Your payment for ${payment.registration.tournament.title} has been confirmed.`,
    type: NotificationType.PAYMENT,
  });

  await autoApproveRegistrationAfterPaid(payment.registrationId);

  return payment;
}

export async function markPaymentRejected(paymentId: string, status: Extract<PaymentRecordStatus, "REJECTED" | "FAILED">, adminNote?: string) {
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status,
      adminNote: adminNote?.trim() || undefined,
      registration: {
        update: { paymentStatus: status === PaymentRecordStatus.FAILED ? PaymentStatus.FAILED : PaymentStatus.PENDING },
      },
    },
    include: paymentInclude,
  });

  await createNotification({
    userId: payment.registration.user.id,
    title: status === PaymentRecordStatus.FAILED ? "Payment failed" : "Payment rejected",
    message: adminNote?.trim() || `Your payment for ${payment.registration.tournament.title} needs attention.`,
    type: NotificationType.PAYMENT,
  });

  return payment;
}

