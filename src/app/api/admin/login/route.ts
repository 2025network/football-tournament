import { NextRequest, NextResponse } from "next/server";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as LoginRequestBody;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return NextResponse.json(
      { message: "Admin credentials are not configured on the server." },
      { status: 500 },
    );
  }

  if (!body.email?.trim() || !body.password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
  }

  const isValidLogin =
    body.email.trim().toLowerCase() === adminEmail.trim().toLowerCase() &&
    body.password === adminPassword;

  if (!isValidLogin) {
    return NextResponse.json({ message: "Invalid admin email or password." }, { status: 401 });
  }

  return NextResponse.json({ message: "Admin login successful." });
}
