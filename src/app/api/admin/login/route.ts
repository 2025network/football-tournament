import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequestBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
    }

    const admin = await prisma.user.findUnique({ where: { email } });

    if (!admin || admin.role !== Role.ADMIN || !admin.passwordHash) {
      return NextResponse.json({ message: "Invalid admin email or password." }, { status: 401 });
    }

    const passwordMatches = await bcrypt.compare(password, admin.passwordHash);

    if (!passwordMatches) {
      return NextResponse.json({ message: "Invalid admin email or password." }, { status: 401 });
    }

    return NextResponse.json({
      message: "Admin login successful.",
      admin: {
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin database login failed", error);
    return NextResponse.json({ message: "Admin login failed." }, { status: 500 });
  }
}
