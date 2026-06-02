import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequestBody;

    if (!body.email?.trim() || !body.password) {
      return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: body.email.trim().toLowerCase() },
    });

    if (!user?.passwordHash) {
      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
    }

    const passwordMatches = await bcrypt.compare(body.password, user.passwordHash);

    if (!passwordMatches) {
      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
    }

    return NextResponse.json({
      message: "Login successful.",
      player: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        platformId: user.platformId ?? "",
        phone: user.phone ?? user.phoneNumber ?? "",
        whatsapp: user.whatsapp ?? user.whatsappNumber ?? "",
        gamerTag: user.gamerTag ?? "",
        defaultGame: user.defaultGame ?? "",
        defaultGamePlayerId: user.defaultGamePlayerId ?? "",
      },
    });
  } catch (error) {
    console.error("Failed to login player", error);
    return NextResponse.json({ message: "Failed to login player." }, { status: 500 });
  }
}


