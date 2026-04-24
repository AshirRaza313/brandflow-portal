import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    const where: any = { isActive: true };
    if (slug) {
      where.slug = slug;
    }

    const pages = await db.legalPage.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { title: "asc" },
    });

    return NextResponse.json({ pages });
  } catch (error: any) {
    console.error("Fetch legal pages error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch legal pages" }, { status: 500 });
  }
}
