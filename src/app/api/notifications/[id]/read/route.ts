import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json({
      message: "Notification marked as read.",
      notification: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: notification.read,
        createdAt: notification.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to mark notification as read", error);
    return NextResponse.json({ message: "Failed to mark notification as read." }, { status: 500 });
  }
}
