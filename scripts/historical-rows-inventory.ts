import { PrismaClient } from "@prisma/client";

const readonlyUrl = process.env.DATABASE_URL_READONLY;
if (!readonlyUrl) {
  console.error("ERROR: DATABASE_URL_READONLY is required. Refusing to run with default DATABASE_URL.");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: readonlyUrl } },
});

function sanitizeOrgId(orgId: string | null): string {
  if (!orgId) return "null";
  return orgId.slice(0, 8) + "...";
}

async function main() {
  console.log("Historical Notification Inventory (Read-Only Audit)");
  console.log("===================================================");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Database identity: configured read-only connection string`);
  console.log(`Read-only role proof: DATABASE_URL_READONLY present`);

  const total = await prisma.notification.count();
  const readCount = await prisma.notification.count({ where: { read: true } });
  const unreadCount = await prisma.notification.count({ where: { read: false } });

  console.log(`\nTotal notifications: ${total}`);
  console.log(`Read: ${readCount}`);
  console.log(`Unread: ${unreadCount}`);

  const byType = await prisma.notification.groupBy({
    by: ["type"],
    _count: { _all: true },
    orderBy: { type: "asc" },
  });
  console.log("\nCounts by type:");
  for (const row of byType) {
    console.log(`  ${row.type}: ${row._count._all}`);
  }

  const byOrg = await prisma.notification.groupBy({
    by: ["orgId"],
    _count: { _all: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });
  console.log("\nTop 10 organizations by notification count (sanitized IDs):");
  for (const row of byOrg) {
    console.log(`  org ${sanitizeOrgId(row.orgId)}: ${row._count._all}`);
  }

  const orgWide = await prisma.notification.count({ where: { userId: null } });
  const targeted = await prisma.notification.count({ where: { userId: { not: null } } });
  console.log(`\nOrg-wide (userId=null): ${orgWide}`);
  console.log(`Targeted (userId set): ${targeted}`);

  try {
    const receiptCount = await prisma.notificationReadReceipt.count();
    const distinctUsers = await prisma.notificationReadReceipt.findMany({ distinct: ["userId"], select: { userId: true } });
    console.log(`\nNotificationReadReceipt rows: ${receiptCount}`);
    console.log(`Distinct users with receipts: ${distinctUsers.length}`);
  } catch (e) {
    console.log("\nNotificationReadReceipt table query failed:", e);
  }

  const genericTypes = ["info", "success", "warning", "error"];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  for (const type of genericTypes) {
    const totalType = await prisma.notification.count({ where: { type } });
    const last7 = await prisma.notification.count({ where: { type, createdAt: { gte: sevenDaysAgo } } });
    const last30 = await prisma.notification.count({ where: { type, createdAt: { gte: thirtyDaysAgo } } });
    if (totalType > 0) {
      console.log(`\nGeneric type '${type}':`);
      console.log(`  Total: ${totalType}, Last 7 days: ${last7}, Last 30 days: ${last30}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("Inventory script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
