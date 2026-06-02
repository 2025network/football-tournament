import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type SignupRequestBody = {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignupRequestBody;
    const validationError = validateSignup(body);

    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const email = body.email!.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser?.passwordHash) {
      return NextResponse.json(
        { message: "An account already exists with this email. Please login instead." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(body.password!, 12);
    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            fullName: body.fullName!.trim(),
            phoneNumber: body.phone!.trim(),
            passwordHash,
            role: Role.PLAYER,
          },
        })
      : await prisma.user.create({
          data: {
            fullName: body.fullName!.trim(),
            email,
            phoneNumber: body.phone!.trim(),
            passwordHash,
            role: Role.PLAYER,
          },
        });

    return NextResponse.json(
      {
        message: "Player account created successfully.",
        player: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phoneNumber ?? "",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create player account", error);
    return NextResponse.json({ message: "Failed to create player account." }, { status: 500 });
  }
}

function validateSignup(body: SignupRequestBody) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[+\d][\d\s-]{6,}$/;

  if (!body.fullName?.trim()) return "Full name is required.";
  if (!body.email || !emailPattern.test(body.email)) return "A valid email is required.";
  if (!body.phone || !phonePattern.test(body.phone)) return "A valid phone number is required.";
  if (!body.password || body.password.length < 6) return "Password must be at least 6 characters.";

  return null;
}
