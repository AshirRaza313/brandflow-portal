import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Historical Notification Inventory (Read-Only Audit)");
  console.log("===================================================");

  // Total counts
  const total = await prisma.notification.count();
  const readCount = await prisma.notification.count({ where: { read: true } });
  const unreadCount = await prisma.notification.count({ where: { read: false } });

  console.log(`Total notifications: ${total}`);
  console.log(`Read: ${readCount}`);
  console.log(`Unread: ${unreadCount}`);

  // Count by type
  const byType = await prisma.notification.groupBy({
    by: ["type"],
    _count: { _all: true },
    orderBy: { type: "asc" },
  });
  console.log("\nCounts by type:");
  for (const row of byType) {
    console.log(`  ${row.type}: ${row._count._all}`);
  }

  // Count by org (top 10)
  const byOrg = await prisma.notification.groupBy({
    by: ["orgId"],
    _count: { _all: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });
  console.log("\nTop 10 organizations by notification count:");
  for (const row of byOrg) {
    console.log(`  org ${row.orgId || "null"}: ${row._count._all}`);
  }

  // Count org-wide vs targeted
  const orgWide = await prisma.notification.count({ where: { userId: null } });
  const targeted = await prisma.notification.count({ where: { userId: { not: null } } });
  console.log(`\nOrg-wide (userId=null): ${orgWide}`);
  console.log(`Targeted (userId set): ${targeted}`);
}

main()
  .catch((e) => {
    console.error("Inventory script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
