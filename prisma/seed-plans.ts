import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding subscription plans...");

  // Upsert the 3 plans (idempotent)
  const plans = [
    {
      name: "starter",
      price: 0,
      period: "forever",
      features: JSON.stringify([
        "Up to 3 team members",
        "100 orders/month",
        "50 products",
        "Basic analytics",
        "5 AI queries/day",
        "Email support",
        "Order management",
        "Customer management",
      ]),
      teamLimit: 3,
      orderLimit: 100,
      productLimit: 50,
      isActive: true,
      trialDays: 14,
    },
    {
      name: "growth",
      price: 4999,
      annualPrice: 49990, // 12 months x Rs. 4,999 = Rs. 59,988 → Rs. 49,990 (save ~17%)
      period: "monthly",
      features: JSON.stringify([
        "Everything in Starter",
        "Unlimited orders",
        "200 products",
        "Advanced analytics",
        "AI tools (unlimited)",
        "Seasonal campaigns",
        "WhatsApp API integration",
        "Priority support",
        "15 team members",
        "Custom branding",
        "Email marketing",
        "SEO tools",
        "Social media management",
        "Ad manager",
        "Influencer tracking",
        "Coupons & loyalty",
      ]),
      teamLimit: 15,
      orderLimit: -1, // unlimited
      productLimit: 200,
      isActive: true,
      trialDays: 14,
    },
    {
      name: "enterprise",
      price: 14999,
      annualPrice: 149990, // 12 months x Rs. 14,999 = Rs. 179,988 → Rs. 149,990 (save ~17%)
      period: "monthly",
      features: JSON.stringify([
        "Everything in Growth",
        "White-label portal",
        "Custom API integrations",
        "Dedicated account manager",
        "Unlimited products",
        "Unlimited team members",
        "Automated reports",
        "SLA guarantee",
        "Import/Export tools",
        "Warehouse management",
        "Returns & SLA engine",
        "Support tickets",
        "Audit log",
      ]),
      teamLimit: -1, // unlimited
      orderLimit: -1,
      productLimit: -1,
      isActive: true,
      trialDays: 14,
    },
  ];

  for (const plan of plans) {
    const result = await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: { ...plan },
      create: { ...plan },
    });
    console.log(`  ✓ ${result.name} — Rs. ${result.price.toLocaleString()}/${result.period}`);
  }

  // Seed default PlatformSettings
  const settings = await prisma.platformSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "Valtriox",
      companyEmail: "support@valtriox.pk",
      companyPhone: "+92-300-0000000",
      companyWebsite: "https://valtriox.pk",
      companyAddress: "Lahore, Pakistan",
      supportHours: "Mon-Fri: 9AM-6PM PKT",
      whatsappNumber: "+92-300-0000000",
      paymentMethods: JSON.stringify([
        {
          name: "Bank Transfer (HBL)",
          accountNumber: "1234-5678-9012-3456",
          bankName: "Habib Bank Limited",
          title: "Valtriox Pvt Ltd",
        },
        {
          name: "JazzCash",
          accountNumber: "0300-0000000",
          bankName: "JazzCash",
          title: "Valtriox",
        },
        {
          name: "EasyPaisa",
          accountNumber: "0300-0000000",
          bankName: "EasyPaisa (Telenor Microfinance Bank)",
          title: "Valtriox",
        },
      ]),
      currency: "PKR",
    },
  });
  console.log(`  ✓ Platform settings seeded`);

  // Seed default roles
  const roles = [
    {
      name: "owner",
      label: "Owner",
      description: "Full access to everything in the organization",
      permissions: JSON.stringify({ all: true }),
      level: 100,
    },
    {
      name: "admin",
      label: "Admin",
      description: "Can manage most settings and team members",
      permissions: JSON.stringify({ orders: true, products: true, customers: true, team: true, settings: true, reports: true }),
      level: 80,
    },
    {
      name: "manager",
      label: "Manager",
      description: "Can manage orders, products, and customers",
      permissions: JSON.stringify({ orders: true, products: true, customers: true, reports: true }),
      level: 60,
    },
    {
      name: "member",
      label: "Team Member",
      description: "Basic access to orders and products",
      permissions: JSON.stringify({ orders: true, products: true }),
      level: 40,
    },
    {
      name: "viewer",
      label: "Viewer",
      description: "Read-only access to dashboards and reports",
      permissions: JSON.stringify({ dashboard: true, reports: true }),
      level: 20,
    },
  ];

  for (const role of roles) {
    const result = await prisma.role.upsert({
      where: { name: role.name },
      update: { ...role },
      create: { ...role },
    });
    console.log(`  ✓ Role: ${result.label} (level ${result.level})`);
  }

  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
