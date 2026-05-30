import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { issueToken } from "@/lib/token";

const bodySchema = z.object({
  phone: z.string().regex(/^\+91\d{10}$/),
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(72),
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

    const { phone, name, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json({ error: "PHONE_TAKEN" }, { status: 409 });
    }

    const userRole = await prisma.role.findUnique({ where: { code: "USER" } });
    if (!userRole) {
      return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        phone,
        name,
        passwordHash,
        userRoles: { create: { roleId: userRole.id } },
      },
      include: { userRoles: { include: { role: true } } },
    });

    const roles = user.userRoles.map((ur) => ur.role.code);
    const userAgent = req.headers.get("user-agent") ?? undefined;
    const ipAddress =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      undefined;
    const token = await issueToken(user.id, roles, userAgent, ipAddress);

    return NextResponse.json(
      { token, user: { userId: user.userId, name: user.name, roles } },
      { status: 201 },
    );
  } catch (err) {
    console.error("[/api/auth/signup]", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: String(err) },
      { status: 500 },
    );
  }
}
