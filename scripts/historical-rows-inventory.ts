import { PrismaClient } from "@prisma/client";

// Read-only role credential: use DATABASE_URL_READONLY if set, otherwise fallback to default
const databaseUrl = process.env.DATABASE_URL_READONLY || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

function sanitizeOrgId(orgId: string | null): string {
  if (!orgId) return "null";
  return orgId.slice(0, 8) + "...";
}

async function main() {
  console.log("Historical Notification Inventory (Read-Only Audit)");
  console.log("===================================================");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Database identity: ${databaseUrl ? "configured" : "missing"}`);
  console.log(`Read-only role proof: ${process.env.DATABASE_URL_READONLY ? "DATABASE_URL_READONLY present" : "using default DATABASE_URL"}`);

  // Total counts
  const total = await prisma.notification.count();
  const readCount = await prisma.notification.count({ where: { read: true } });
  const unreadCount = await prisma.notification.count({ where: { read: false } });

  console.log(`\nTotal notifications: ${total}`);
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

  // Count by org (top 10) with sanitized IDs
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

  // Count org-wide vs targeted
  const orgWide = await prisma.notification.count({ where: { userId: null } });
  const targeted = await prisma.notification.count({ where: { userId: { not: null } } });
  console.log(`\nOrg-wide (userId=null): ${orgWide}`);
  console.log(`Targeted (userId set): ${targeted}`);

  // NotificationReadReceipt state count
  try {
    const receiptCount = await prisma.notificationReadReceipt.count();
    const distinctUsers = await prisma.notificationReadReceipt.findMany({ distinct: ["userId"], select: { userId: true } });
    console.log(`\nNotificationReadReceipt rows: ${receiptCount}`);
    console.log(`Distinct users with receipts: ${distinctUsers.length}`);
  } catch (e) {
    console.log("\nNotificationReadReceipt table not available yet (migration pending).");
  }

  // Historical generic rows fingerprint/date window classification
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
