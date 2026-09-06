import { PrismaClient } from "@prisma/client";

const readonlyUrl = process.env.DATABASE_URL_READONLY;
if (!readonlyUrl) {
  console.error("ERROR: DATABASE_URL_READONLY is required. Refusing to run with default DATABASE_URL.");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: readonlyUrl } } });

function sanitizeOrgId(orgId: string | null): string {
  if (!orgId) return "null";
  return orgId.slice(0, 8) + "...";
}

async function main() {
  console.log("Historical Notification Inventory (Read-Only Audit)");
  console.log("===================================================");
  const nowIso = new Date().toISOString();
  const env = process.env.NODE_ENV || "development";
  const headSha = process.env.PR_HEAD_SHA || (() => {
    try { return require("child_process").execSync("git rev-parse HEAD").toString().trim(); } catch { return "unknown"; }
  })();
  console.log(`Timestamp: ${nowIso}`);
  console.log(`Environment: ${env}`);
  console.log(`HEAD SHA: ${headSha}`);

  // Verify SELECT-only grants (no INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER)
  const writeGrants = await prisma.$queryRawUnsafe(`
    SELECT table_name, privilege_type
    FROM information_schema.role_table_grants
    WHERE grantee = current_user
      AND table_schema = 'public'
      AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')
  `) as any[];

  if (writeGrants.length > 0) {
    console.error("ERROR: current user has write privileges on public tables; SELECT-only role required.");
    console.error(JSON.stringify(writeGrants, null, 2));
    process.exit(1);
  }

  const roleRows = await prisma.$queryRawUnsafe(`
    SELECT current_user, session_user, current_setting('transaction_read_only') AS read_only, current_setting('transaction_isolation') AS isolation
  `) as any[];
  if (!roleRows.length) {
    console.error("ERROR: database role query returned no rows; aborting.");
    process.exit(1);
  }
  const row = roleRows[0];
  console.log(`Database role: current_user=${row.current_user}, session_user=${row.session_user}`);
  console.log(`Read-only mode: ${row.read_only}, isolation: ${row.isolation}`);
  if (String(row.read_only).toLowerCase() !== "on") {
    console.error("ERROR: transaction_read_only is off; aborting to protect data.");
    process.exit(1);
  }

  console.log("SELECT-only grants verified.");

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
  for (const r of byType) {
    console.log(`  ${r.type}: ${r._count._all}`);
  }

  const byOrg = await prisma.notification.groupBy({
    by: ["orgId"],
    _count: { _all: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });
  console.log("\nTop 10 organizations by notification count (sanitized IDs):");
  for (const r of byOrg) {
    console.log(`  org ${sanitizeOrgId(r.orgId)}: ${r._count._all}`);
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
