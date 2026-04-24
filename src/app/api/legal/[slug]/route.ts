import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await ensureDb();
    const { slug } = await params;

    const page = await db.legalPage.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: `Legal page with slug "${slug}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ page });
  } catch (error: any) {
    console.error("Fetch legal page error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch legal page" }, { status: 500 });
  }
}
