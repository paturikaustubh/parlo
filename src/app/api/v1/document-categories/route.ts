import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const categories = await prisma.document_categories.findMany({
      where: { is_active: true },
      select: {
        code: true,
        display_name: true,
      },
      orderBy: {
        sort_order: "asc",
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("[DOCUMENT_CATEGORIES_GET]:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch document categories",
        },
      },
      { status: 500 },
    );
  }
}
