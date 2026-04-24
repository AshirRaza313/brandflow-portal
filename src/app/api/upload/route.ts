import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// POST — Convert uploaded image to base64 and return it
// The base64 string is then stored in the Organization model's logo/favicon field
export const POST = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Upload] POST request", { userId: authCtx.userId });
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, SVG, WebP" },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB" },
        { status: 400 }
      );
    }

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // Build data URL
    const mimeType = file.type === "image/svg+xml" ? "image/svg+xml" : file.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      dataUrl,
      mimeType: file.type,
      size: file.size,
      name: file.name,
    });
  } catch (error: any) {
    console.error("Upload error:", error?.message || error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
});
