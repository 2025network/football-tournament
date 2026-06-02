import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { GameTitle, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isValidEmail, isValidNigerianPhone, normalizePhone } from "@/lib/player-validation";

type SignupRequestBody = {
  fullName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  gamerTag?: string;
  preferredGame?: GameTitle | "";
  defaultGamePlayerId?: string;
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
      return NextResponse.json({ message: "An account already exists with this email. Please login instead." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(body.password!, 12);
    const platformId = existingUser?.platformId ?? await generatePlatformId();
    const phone = normalizePhone(body.phone!);
    const whatsapp = normalizePhone(body.whatsapp!);
    const favoriteGame = body.preferredGame || null;

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            fullName: body.fullName!.trim(),
            platformId,
            phone,
            whatsapp,
            phoneNumber: phone,
            whatsappNumber: whatsapp,
            gamerTag: body.gamerTag!.trim(),
            favoriteGame,
            defaultGame: favoriteGame,
            defaultGamePlayerId: body.defaultGamePlayerId?.trim() || null,
            passwordHash,
            role: Role.PLAYER,
          },
        })
      : await prisma.user.create({
          data: {
            fullName: body.fullName!.trim(),
            email,
            platformId,
            phone,
            whatsapp,
            phoneNumber: phone,
            whatsappNumber: whatsapp,
            gamerTag: body.gamerTag!.trim(),
            favoriteGame,
            defaultGame: favoriteGame,
            defaultGamePlayerId: body.defaultGamePlayerId?.trim() || null,
            passwordHash,
            role: Role.PLAYER,
          },
        });

    return NextResponse.json({ message: `Player account created successfully. Your Platform ID is ${user.platformId}.`, player: serializePlayer(user) }, { status: 201 });
  } catch (error) {
    console.error("Failed to create player account", error);
    return NextResponse.json({ message: "Failed to create player account." }, { status: 500 });
  }
}

function validateSignup(body: SignupRequestBody) {
  if (!body.fullName?.trim()) return "Full name is required.";
  if (!body.email || !isValidEmail(body.email)) return "Enter a valid email address.";
  if (!body.phone || !isValidNigerianPhone(body.phone)) return "Phone number must be 11 digits and start with 070, 080, 081, 090, or 091.";
  if (!body.whatsapp || !isValidNigerianPhone(body.whatsapp)) return "WhatsApp number must be 11 digits and start with 070, 080, 081, 090, or 091.";
  if (!body.gamerTag?.trim()) return "Gamer tag is required.";
  if (body.preferredGame && !Object.values(GameTitle).includes(body.preferredGame)) return "Choose a valid preferred game.";
  if (!body.password || body.password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

async function generatePlatformId() {
  let nextNumber = await prisma.user.count({ where: { platformId: { not: null } } }) + 1;

  while (true) {
    const platformId = `FT-${String(nextNumber).padStart(6, "0")}`;
    const existing = await prisma.user.findUnique({ where: { platformId } });
    if (!existing) return platformId;
    nextNumber += 1;
  }
}

function serializePlayer(user: {
  id: string;
  fullName: string;
  email: string;
  platformId: string | null;
  phone: string | null;
  whatsapp: string | null;
  phoneNumber: string | null;
  whatsappNumber: string | null;
  gamerTag: string | null;
  defaultGame: GameTitle | null;
  defaultGamePlayerId: string | null;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    platformId: user.platformId ?? "",
    phone: user.phone ?? user.phoneNumber ?? "",
    whatsapp: user.whatsapp ?? user.whatsappNumber ?? "",
    gamerTag: user.gamerTag ?? "",
    defaultGame: user.defaultGame ?? "",
    defaultGamePlayerId: user.defaultGamePlayerId ?? "",
  };
}
