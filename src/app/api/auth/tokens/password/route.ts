import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { issueToken } from "@/lib/token";

const bodySchema = z.object({
  phone: z.string().regex(/^\+91\d{10}$/),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { phone, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { phone },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json({ error: "PASSWORD_NOT_SET" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }

    const roles = user.userRoles.map((ur) => ur.role.code);
    const userAgent = req.headers.get("user-agent") ?? undefined;
    const ipAddress =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      undefined;
    const token = await issueToken(user.id, roles, userAgent, ipAddress);

    return NextResponse.json({
      token,
      user: { userId: user.userId, name: user.name, roles },
    });
  } catch (err) {
    console.error("[/api/auth/tokens/password]", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: String(err) },
      { status: 500 },
    );
  }
}
