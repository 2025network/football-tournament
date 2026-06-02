import { NextRequest, NextResponse } from "next/server";
import { NotificationType } from "@/generated/prisma/client";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

type NotificationRequestBody = {
  email?: string;
  userId?: string;
  title?: string;
  message?: string;
  type?: NotificationType;
};

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ message: "Player email is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ message: "Player account not found." }, { status: 404 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      unreadCount: notifications.filter((notification) => !notification.read).length,
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: notification.read,
        createdAt: notification.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch notifications", error);
    return NextResponse.json({ message: "Failed to fetch notifications." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as NotificationRequestBody;

    if (!body.title?.trim()) return NextResponse.json({ message: "Title is required." }, { status: 400 });
    if (!body.message?.trim()) return NextResponse.json({ message: "Message is required." }, { status: 400 });
    if (body.type && !Object.values(NotificationType).includes(body.type)) return NextResponse.json({ message: "Valid notification type is required." }, { status: 400 });

    let userId = body.userId;

    if (!userId && body.email) {
      const user = await prisma.user.findUnique({ where: { email: body.email.trim().toLowerCase() } });
      userId = user?.id;
    }

    if (!userId) {
      return NextResponse.json({ message: "userId or email is required." }, { status: 400 });
    }

    const notification = await createNotification({
      userId,
      title: body.title.trim(),
      message: body.message.trim(),
      type: body.type ?? NotificationType.INFO,
    });

    return NextResponse.json({
      message: "Notification created.",
      notification: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: notification.read,
        createdAt: notification.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create notification", error);
    return NextResponse.json({ message: "Failed to create notification." }, { status: 500 });
  }
}
