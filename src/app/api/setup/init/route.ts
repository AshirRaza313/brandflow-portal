import { NextRequest, NextResponse } from "next/server";

// POST /api/setup/init — Creates admin account, seeds plans, runs setup
// This is a ONE-TIME setup endpoint called after DATABASE_URL is configured.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminEmail, databaseUrl } = body;

    if (!adminEmail) {
      return NextResponse.json({ error: "adminEmail is required" }, { status: 400 });
    }

    // Override DATABASE_URL if provided
    if (databaseUrl) {
      process.env.DATABASE_URL = databaseUrl;
    }

    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    // Test connection
    await prisma.$queryRaw`SELECT 1`;

    // Check if admin already exists
    let admin = await prisma.user.findFirst({
      where: { email: adminEmail },
    });

    if (!admin) {
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash("admin123", 10);
      admin = await prisma.user.create({
        data: {
          name: "Platform Admin",
          email: adminEmail,
          password: hashedPassword,
          role: "platform_owner",
        },
      });
    }

    // Create organization for admin
    const slug = adminEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");
    let org = await prisma.organization.findFirst({ where: { slug } });

    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: "Valtriox Admin",
          slug,
          email: adminEmail,
          country: "PK",
          currency: "PKR",
          plan: "enterprise",
          isActive: true,
        },
      });
      await prisma.organizationMember.create({
        data: { organizationId: org.id, userId: admin.id, role: "owner" },
      });
    }

    // Seed subscription plans
    const planCount = await prisma.subscriptionPlan.count();
    if (planCount === 0) {
      const plans = [
        {
          name: "starter", price: 999, annualPrice: 9990,
          features: JSON.stringify(["5 Team Members", "100 Orders/Month", "50 Products", "Basic Reports", "Email Support"]),
          teamLimit: 5, orderLimit: 100, productLimit: 50, trialDays: 14,
        },
        {
          name: "professional", price: 2999, annualPrice: 29990,
          features: JSON.stringify(["15 Team Members", "500 Orders/Month", "200 Products", "Advanced Reports", "Priority Support", "API Access"]),
          teamLimit: 15, orderLimit: 500, productLimit: 200, trialDays: 14,
        },
        {
          name: "enterprise", price: 7999, annualPrice: 79990,
          features: JSON.stringify(["Unlimited Team", "Unlimited Orders", "Unlimited Products", "Custom Reports", "24/7 Support", "API Access", "White Label", "Custom Domain"]),
          teamLimit: -1, orderLimit: -1, productLimit: -1, trialDays: 30,
        },
      ];
      for (const plan of plans) {
        await prisma.subscriptionPlan.create({ data: plan });
      }
    }

    // Create PlatformSettings
    const settingsCount = await prisma.platformSettings.count();
    if (settingsCount === 0) {
      await prisma.platformSettings.create({
        data: {
          companyName: "Valtriox",
          companyEmail: "support@valtriox.com",
          tagline: "Command Your Brand",
          primaryBrandColor: "#C9A227",
          secondaryBrandColor: "#B8860B",
          currency: "PKR",
          currencySymbol: "Rs.",
          paymentMethods: JSON.stringify(["bank_transfer", "jazzcash", "easypaisa", "credit_card"]),
        },
      });
    }

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: "Setup completed!",
      admin: { email: admin.email, password: "admin123" },
    });
  } catch (error: any) {
    console.error("[Setup] Error:", error?.message);
    return NextResponse.json(
      { error: "Setup failed", details: error?.message, hint: "Make sure DATABASE_URL is set correctly." },
      { status: 500 }
    );
  }
}

// GET /api/setup/init — Check if database is configured
export async function GET() {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    await prisma.$disconnect();
    return NextResponse.json({ configured: userCount > 0 });
  } catch {
    return NextResponse.json({
      configured: false,
      needsDatabase: true,
      hint: "DATABASE_URL not set. Add it in Vercel → Settings → Environment Variables. Get free DB at neon.tech",
    });
  }
}
