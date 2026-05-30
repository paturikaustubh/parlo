import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getOrRotateQr } from "@/services/qr.service";
import { UnauthorizedError, NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ spaceId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  let auth: Awaited<ReturnType<typeof requireRole>> | null = null;
  try {
    auth = await requireRole(req, "STAFF", "OWNER");
  } catch {
    return new Response(
      JSON.stringify({
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const { spaceId } = await ctx.params;
  const space = await prisma.space.findUnique({ where: { spaceId } });
  if (!space) {
    return new Response(
      JSON.stringify({
        error: { code: "NOT_FOUND", message: "Space not found" },
      }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  const spaceDbId = space.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      let rotationTimer: ReturnType<typeof setTimeout> | null = null;
      let closed = false;

      const close = () => {
        closed = true;
        if (rotationTimer) clearTimeout(rotationTimer);
        controller.close();
      };

      req.signal.addEventListener("abort", close);

      const pushAndSchedule = async () => {
        if (closed) return;

        try {
          const qr = await getOrRotateQr(spaceDbId);
          send("qr", qr);

          // Schedule the next push for ~100ms after this QR expires
          const msUntilExpiry = qr.expiresAt - Date.now();
          const delay = Math.max(msUntilExpiry + 100, 100);

          rotationTimer = setTimeout(pushAndSchedule, delay);
        } catch (err) {
          send("error", {
            code: "INTERNAL_ERROR",
            message: "Failed to rotate QR",
          });
          close();
        }
      };

      await pushAndSchedule();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
