import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AppError } from "./errors";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function withErrorHandling<C = unknown>(
  handler: (req: NextRequest, ctx: C) => Promise<NextResponse>,
) {
  return async (req: NextRequest, ctx?: unknown): Promise<NextResponse> => {
    try {
      return await handler(req, ctx as C);
    } catch (err) {
      if (err instanceof AppError) {
        return NextResponse.json(
          {
            error: {
              code: err.code,
              message: err.message,
              details: err.details,
            },
          },
          { status: err.statusCode },
        );
      }
      console.error("[Unhandled]", err);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
          },
        },
        { status: 500 },
      );
    }
  };
}
