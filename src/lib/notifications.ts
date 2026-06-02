import { NotificationType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type CreateNotificationInput = {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
};

export async function createNotification({ userId, title, message, type = NotificationType.INFO }: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
    },
  });
}

export async function notifyRegistration(registrationId: string, title: string, message: string, type: NotificationType) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { userId: true },
  });

  if (!registration) return null;

  return createNotification({ userId: registration.userId, title, message, type });
}

export async function notifyRegistrations(registrationIds: string[], title: string, message: string, type: NotificationType) {
  const uniqueIds = Array.from(new Set(registrationIds.filter(Boolean)));

  if (uniqueIds.length === 0) return;

  const registrations = await prisma.registration.findMany({
    where: { id: { in: uniqueIds } },
    select: { userId: true },
  });

  await Promise.all(
    registrations.map((registration) =>
      createNotification({ userId: registration.userId, title, message, type }),
    ),
  );
}
