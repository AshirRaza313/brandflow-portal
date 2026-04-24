import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { generateReportPDF, type ReportData } from "@/lib/pdf-generator";
import { getCurrencyForCountry } from "@/lib/currency";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// ── Chart Color Palettes ──
const PIE_COLORS = ["#f59e0b", "#34d399", "#60a5fa", "#f87171", "#a78bfa", "#fb923c", "#38bdf8", "#4ade80"];
const BAR_COLORS = [
  "#f59e0b", "#fbbf24", "#d97706", "#b45309", "#92400e",
  "#78350f", "#fcd34d", "#fde68a", "#fef3c7", "#34d399",
];

// ── Change Calculation Helper ──
function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

// Helper: safely parse date from DB
function safeDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  try {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

// Helper: format date as short day label (e.g. "Mon 15")
function formatDayLabel(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[date.getDay()]} ${date.getDate()}`;
}

// Helper: format month label (e.g. "Jan 2025")
function formatMonthLabel(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Helper: truncate label for chart display
function truncateLabel(str: string, maxLen: number = 18): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + "\u2026" : str;
}

// GET /api/reports/export?type=sales|customers|products&orgId=xxx&period=daily|weekly|monthly
export const GET = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Reports Export] GET request", { userId: authCtx.userId });
    await ensureDb();
    const type = req.nextUrl.searchParams.get("type") || "sales";
    const orgId = req.nextUrl.searchParams.get("orgId") || authCtx.organizationId!;
    const period = req.nextUrl.searchParams.get("period") || "monthly";

    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get org info for branding
    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const currency = getCurrencyForCountry(org.country || "PK");
    const sym = currency.symbol;

    // Fetch platform settings for PDF branding (footer, etc.)
    let platformSettings: any = null;
    try {
      platformSettings = await db.platformSettings.findFirst({ orderBy: { createdAt: "desc" } });
    } catch (psErr: any) {
      console.warn("[Report Export] platformSettings fetch failed:", psErr?.message);
    }

    const platformInfo = {
      platformName: platformSettings?.companyName || "BrandFlow",
      platformEmail: platformSettings?.companyEmail || undefined,
      platformPhone: platformSettings?.companyPhone || undefined,
      platformWebsite: platformSettings?.companyWebsite || undefined,
      platformWhatsapp: platformSettings?.whatsappNumber || undefined,
      platformInstagram: platformSettings?.instagramUrl || undefined,
      platformFacebook: platformSettings?.facebookUrl || undefined,
      platformTwitter: platformSettings?.twitterUrl || undefined,
      platformSupportHours: platformSettings?.supportHours || undefined,
      platformLogo: platformSettings?.logoUrl || undefined,
      platformTagline: platformSettings?.tagline || "Pakistan's #1 Brand Management Portal",
    };

    let reportData: ReportData;

    switch (type) {
      // ════════════════════════════════════════════════════════════════════
      // SALES REPORT
      // ════════════════════════════════════════════════════════════════════
      case "sales": {
        const now = new Date();
        const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);

        // ── Current Period Date Range ──
        let startDate: Date;
        switch (period) {
          case "daily":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "weekly":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // ── Previous Period Date Range (same duration, shifted back) ──
        const duration = now.getTime() - startDate.getTime();
        const prevStart = new Date(startDate.getTime() - duration - 1);
        const prevEnd = new Date(startDate.getTime() - 1);

        // ── Fetch Orders ──
        const orders = await db.order.findMany({
          where: { organizationId: orgId, createdAt: { gte: startDate } },
          include: { items: true },
          orderBy: { createdAt: "desc" },
        });

        // ── Fetch Previous Period Orders (for comparison) ──
        const prevOrders = await db.order.findMany({
          where: { organizationId: orgId, createdAt: { gte: prevStart, lt: prevEnd } },
          include: { items: true },
        });

        // ── Current Period Metrics ──
        const totalRevenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
        const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
        const refunds = orders
          .filter((o) => o.status === "cancelled" || o.status === "returns")
          .reduce((s, o) => s + (Number(o.total) || 0), 0);

        // ── Previous Period Metrics ──
        const prevRevenue = prevOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
        const prevOrderCount = prevOrders.length;
        const prevAvgOrderValue = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0;

        // ── No Data Handling ──
        const hasNoData = orders.length === 0;
        const summaryText = hasNoData
          ? "No data available for this period."
          : `Total of ${orders.length} orders processed during this period, generating ${sym} ${totalRevenue.toLocaleString()} in revenue.`;

        // ── Trend Chart Data: Daily Revenue Breakdown ──
        const dailyMap = new Map<string, number>();
        const dayIter = new Date(startDate);
        while (dayIter <= now) {
          dailyMap.set(formatDayLabel(new Date(dayIter)), 0);
          dayIter.setDate(dayIter.getDate() + 1);
        }
        orders.forEach((o) => {
          const d = safeDate(o.createdAt);
          if (d) {
            const label = formatDayLabel(d);
            dailyMap.set(label, (dailyMap.get(label) || 0) + (Number(o.total) || 0));
          }
        });
        const trendChartData = Array.from(dailyMap.entries()).map(([label, value]) => ({
          label,
          value: Math.round(value),
        }));

        // ── Pie Chart Data: Order Status Breakdown ──
        const statusMap = new Map<string, number>();
        orders.forEach((o) => {
          const status = o.status.charAt(0).toUpperCase() + o.status.slice(1);
          statusMap.set(status, (statusMap.get(status) || 0) + 1);
        });
        const pieChartData = Array.from(statusMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([label, value], i) => ({ label, value, color: PIE_COLORS[i % PIE_COLORS.length] }));

        // ── Bar Chart Data: Top 5 Products by Revenue ──
        const productRevenueMap = new Map<string, number>();
        orders.forEach((o) => {
          o.items.forEach((item) => {
            productRevenueMap.set(
              item.productName,
              (productRevenueMap.get(item.productName) || 0) + (Number(item.total) || 0),
            );
          });
        });
        const barChartData = Array.from(productRevenueMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([label, value], i) => ({
            label: truncateLabel(label),
            value: Math.round(value),
            color: BAR_COLORS[i % BAR_COLORS.length],
          }));

        // ── Comparison Data ──
        const comparison = [
          {
            label: "Total Revenue",
            current: Math.round(totalRevenue),
            previous: Math.round(prevRevenue),
            change: calcChange(Math.round(totalRevenue), Math.round(prevRevenue)),
          },
          {
            label: "Total Orders",
            current: orders.length,
            previous: prevOrderCount,
            change: calcChange(orders.length, prevOrderCount),
          },
          {
            label: "Avg Order Value",
            current: Math.round(avgOrderValue),
            previous: Math.round(prevAvgOrderValue),
            change: calcChange(Math.round(avgOrderValue), Math.round(prevAvgOrderValue)),
          },
        ];

        reportData = {
          title: "Sales Report",
          subtitle: "Sales Analytics Overview",
          period: `${periodLabel} \u2014 ${startDate.toLocaleDateString("en-PK")} to ${now.toLocaleDateString("en-PK")}`,
          generatedAt: now.toLocaleString("en-PK"),
          orgName: org.name,
          orgEmail: org.email || undefined,
          brandName: org.name,
          brandColor: org.brandColor || undefined,
          plan: org.plan,
          ...platformInfo,
          stats: [
            { label: "Total Revenue", value: `${sym} ${totalRevenue.toLocaleString()}` },
            { label: "Total Orders", value: orders.length },
            { label: "Avg Order Value", value: `${sym} ${Math.round(avgOrderValue).toLocaleString()}` },
            { label: "Refunds", value: `${sym} ${refunds.toLocaleString()}` },
          ],
          tables: [
            {
              title: "Recent Orders",
              headers: ["Order #", "Customer", "Amount", "Status", "Date"],
              rows: orders.slice(0, 20).map((o) => {
                const cDate = safeDate(o.createdAt);
                return [
                  o.orderNumber || "N/A",
                  "Customer",
                  `${sym} ${(Number(o.total) || 0).toLocaleString()}`,
                  o.status.charAt(0).toUpperCase() + o.status.slice(1),
                  cDate
                    ? cDate.toLocaleDateString("en-PK", { month: "short", day: "numeric" })
                    : "N/A",
                ];
              }),
            },
          ],
          summary: summaryText,
          trendChartData,
          comparison: { previousPeriodLabel: "Previous Period", stats: [
            { label: "Total Revenue", currentValue: Math.round(totalRevenue), previousValue: Math.round(prevRevenue), change: calcChange(Math.round(totalRevenue), Math.round(prevRevenue)) },
            { label: "Total Orders", currentValue: orders.length, previousValue: prevOrderCount, change: calcChange(orders.length, prevOrderCount) },
            { label: "Avg Order Value", currentValue: Math.round(avgOrderValue), previousValue: Math.round(prevAvgOrderValue), change: calcChange(Math.round(avgOrderValue), Math.round(prevAvgOrderValue)) },
          ]},
          pieChartData,
          barChartData,
        };
        break;
      }

      // ════════════════════════════════════════════════════════════════════
      // CUSTOMER REPORT
      // ════════════════════════════════════════════════════════════════════
      case "customers": {
        const now = new Date();
        const customers = await db.customer.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: "desc" },
        });

        // ── Current Metrics ──
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const newThisMonth = customers.filter((c) => {
          const d = safeDate(c.createdAt);
          return d && d >= monthStart;
        }).length;
        const totalSpent = customers.reduce((s, c) => s + (Number(c.totalSpent) || 0), 0);
        const avgLTV = customers.length > 0 ? totalSpent / customers.length : 0;
        const withOrders = customers.filter((c) => Number(c.orderCount) > 0);
        const retentionRate =
          withOrders.length > 0
            ? Math.round(
                (customers.filter((c) => Number(c.orderCount) > 1).length / withOrders.length) * 100,
              )
            : 0;

        // ── Previous Month Metrics (for comparison) ──
        const customersBeforeThisMonth = customers.filter((c) => {
          const d = safeDate(c.createdAt);
          return d && d < monthStart;
        });
        const prevTotalCustomers = customersBeforeThisMonth.length;
        const prevWithOrders = customersBeforeThisMonth.filter((c) => Number(c.orderCount) > 0);
        const prevRetention =
          prevWithOrders.length > 0
            ? Math.round(
                (customersBeforeThisMonth.filter((c) => Number(c.orderCount) > 1).length /
                  prevWithOrders.length) *
                  100,
              )
            : 0;
        const prevTotalSpent = customersBeforeThisMonth.reduce(
          (s, c) => s + (Number(c.totalSpent) || 0),
          0,
        );
        const prevAvgLTV = prevTotalCustomers > 0 ? prevTotalSpent / prevTotalCustomers : 0;

        // ── No Data Handling ──
        const hasNoData = customers.length === 0;
        const summaryText = hasNoData
          ? "No data available for this period."
          : `${customers.length} total customers. Total customer lifetime value: ${sym} ${totalSpent.toLocaleString()}.`;

        // ── Trend Chart Data: New Customers Per Month (Last 6 Months) ──
        const trendChartData: Array<{ label: string; value: number }> = [];
        for (let i = 5; i >= 0; i--) {
          const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
          const count = customers.filter((c) => {
            const d = safeDate(c.createdAt);
            return d && d >= mStart && d < mEnd;
          }).length;
          trendChartData.push({ label: formatMonthLabel(mStart), value: count });
        }

        // ── Bar Chart Data: Top 10 Customers by Total Spent ──
        const barChartData = [...customers]
          .sort((a, b) => Number(b.totalSpent || 0) - Number(a.totalSpent || 0))
          .slice(0, 10)
          .map((c, i) => ({
            label: truncateLabel(c.name, 15),
            value: Math.round(Number(c.totalSpent) || 0),
            color: BAR_COLORS[i % BAR_COLORS.length],
          }));

        // ── Pie Chart Data: Customer Tier Distribution ──
        const tierMap = new Map<string, number>();
        const tierLabels: Record<string, string> = {
          new: "New",
          bronze: "Bronze",
          silver: "Silver",
          gold: "Gold",
        };
        customers.forEach((c) => {
          const tier = tierLabels[c.loyaltyTier] || c.loyaltyTier.charAt(0).toUpperCase() + c.loyaltyTier.slice(1);
          tierMap.set(tier, (tierMap.get(tier) || 0) + 1);
        });
        const pieChartData = Array.from(tierMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([label, value], i) => ({ label, value, color: PIE_COLORS[i % PIE_COLORS.length] }));

        // ── Comparison Data ──
        const comparison = [
          {
            label: "Total Customers",
            current: customers.length,
            previous: prevTotalCustomers,
            change: calcChange(customers.length, prevTotalCustomers),
          },
          {
            label: "Retention Rate",
            current: retentionRate,
            previous: prevRetention,
            change: calcChange(retentionRate, prevRetention),
          },
          {
            label: "Avg LTV",
            current: Math.round(avgLTV),
            previous: Math.round(prevAvgLTV),
            change: calcChange(Math.round(avgLTV), Math.round(prevAvgLTV)),
          },
        ];

        reportData = {
          title: "Customer Report",
          subtitle: "Customer Analytics Overview",
          period: "All Time",
          generatedAt: now.toLocaleString("en-PK"),
          orgName: org.name,
          orgEmail: org.email || undefined,
          brandName: org.name,
          brandColor: org.brandColor || undefined,
          plan: org.plan,
          ...platformInfo,
          stats: [
            { label: "Total Customers", value: customers.length },
            { label: "New This Month", value: newThisMonth },
            { label: "Retention Rate", value: `${retentionRate}%` },
            { label: "Avg LTV", value: `${sym} ${Math.round(avgLTV).toLocaleString()}` },
          ],
          tables: [
            {
              title: "Top Customers",
              headers: ["Name", "Phone", "Total Spent", "Orders", "Tier"],
              rows: [...customers]
                .sort((a, b) => Number(b.totalSpent || 0) - Number(a.totalSpent || 0))
                .slice(0, 20)
                .map((c) => [
                  c.name,
                  c.phone || "\u2014",
                  `${sym} ${Number(c.totalSpent || 0).toLocaleString()}`,
                  String(c.orderCount || 0),
                  c.loyaltyTier || "\u2014",
                ]),
            },
          ],
          summary: summaryText,
          barChartData,
          trendChartData,
          pieChartData,
          comparison: { previousPeriodLabel: "Previous Month", stats: [
            { label: "Total Customers", currentValue: customers.length, previousValue: prevTotalCustomers, change: calcChange(customers.length, prevTotalCustomers) },
            { label: "Retention Rate", currentValue: retentionRate, previousValue: prevRetention, change: calcChange(retentionRate, prevRetention) },
            { label: "Avg LTV", currentValue: Math.round(avgLTV), previousValue: Math.round(prevAvgLTV), change: calcChange(Math.round(avgLTV), Math.round(prevAvgLTV)) },
          ]},
        };
        break;
      }

      // ════════════════════════════════════════════════════════════════════
      // PRODUCT REPORT
      // ════════════════════════════════════════════════════════════════════
      case "products": {
        const now = new Date();
        const products = await db.product.findMany({
          where: { organizationId: orgId },
          include: { orderItems: true },
          orderBy: { createdAt: "desc" },
        });

        // ── Current Metrics ──
        const totalSold = products.reduce(
          (s, p) => s + p.orderItems.reduce((is, item) => is + (Number(item.quantity) || 0), 0),
          0,
        );
        const outOfStock = products.filter((p) => Number(p.stock) <= 0).length;
        const productsWithCost = products.filter(
          (p) => p.costPrice !== null && Number(p.costPrice) > 0,
        );
        const avgMargin =
          productsWithCost.length > 0
            ? productsWithCost.reduce(
                (s, p) =>
                  s + ((Number(p.price) - Number(p.costPrice || 0)) / Number(p.price)) * 100,
                0,
              ) / productsWithCost.length
            : 0;

        // ── Previous Month Date Ranges ──
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // Products that existed before this month
        const prevTotalProducts = products.filter((p) => {
          const d = safeDate(p.createdAt);
          return d && d < thisMonthStart;
        }).length;

        // Avg margin of products that existed before this month
        const prevProductsWithCost = products.filter((p) => {
          const d = safeDate(p.createdAt);
          return d && d < thisMonthStart && p.costPrice !== null && Number(p.costPrice) > 0;
        });
        const prevAvgMargin =
          prevProductsWithCost.length > 0
            ? prevProductsWithCost.reduce(
                (s, p) =>
                  s + ((Number(p.price) - Number(p.costPrice || 0)) / Number(p.price)) * 100,
                0,
              ) / prevProductsWithCost.length
            : 0;

        // ── Items Sold: This Month vs Previous Month ──
        let thisMonthSold = 0;
        let prevMonthSold = 0;
        try {
          const [thisMonthItems, prevMonthItems] = await Promise.all([
            db.orderItem.findMany({
              where: {
                order: {
                  organizationId: orgId,
                  createdAt: { gte: thisMonthStart },
                },
              },
              select: { quantity: true },
            }),
            db.orderItem.findMany({
              where: {
                order: {
                  organizationId: orgId,
                  createdAt: { gte: prevMonthStart, lt: thisMonthStart },
                },
              },
              select: { quantity: true },
            }),
          ]);
          thisMonthSold = thisMonthItems.reduce((s, item) => s + (Number(item.quantity) || 0), 0);
          prevMonthSold = prevMonthItems.reduce((s, item) => s + (Number(item.quantity) || 0), 0);
        } catch (itemErr: any) {
          console.warn("[Report Export] order item comparison fetch failed:", itemErr?.message);
        }

        // ── No Data Handling ──
        const hasNoData = products.length === 0;
        const summaryText = hasNoData
          ? "No data available for this period."
          : `${products.length} products cataloged. ${totalSold} units sold total. ${outOfStock} products out of stock.`;

        // ── Build Product Rows (sorted by revenue, for table + bar chart) ──
        const productRows = [...products]
          .map((p) => ({
            name: p.name,
            category: p.category || "\u2014",
            price: Number(p.price),
            qty: p.orderItems.reduce((s, item) => s + (Number(item.quantity) || 0), 0),
            revenue: p.orderItems.reduce((s, item) => s + (Number(item.total) || 0), 0),
          }))
          .sort((a, b) => b.revenue - a.revenue || b.qty - a.qty);

        // ── Bar Chart Data: Top 10 Products by Revenue ──
        const barChartData = productRows
          .slice(0, 10)
          .map((p, i) => ({
            label: truncateLabel(p.name, 18),
            value: Math.round(p.revenue),
            color: BAR_COLORS[i % BAR_COLORS.length],
          }));

        // ── Pie Chart Data: Stock Status Distribution ──
        const LOW_STOCK_THRESHOLD = 10;
        const inStock = products.filter((p) => Number(p.stock) > LOW_STOCK_THRESHOLD).length;
        const lowStock = products.filter(
          (p) => Number(p.stock) > 0 && Number(p.stock) <= LOW_STOCK_THRESHOLD,
        ).length;
        const outOfStockCount = products.filter((p) => Number(p.stock) <= 0).length;
        const pieChartData = [
          { label: "In Stock", value: inStock, color: PIE_COLORS[1] },
          { label: "Low Stock", value: lowStock, color: PIE_COLORS[0] },
          { label: "Out of Stock", value: outOfStockCount, color: PIE_COLORS[3] },
        ].filter((seg) => seg.value > 0);

        // ── Comparison Data ──
        const comparison = [
          {
            label: "Total Products",
            current: products.length,
            previous: prevTotalProducts,
            change: calcChange(products.length, prevTotalProducts),
          },
          {
            label: "Avg Margin",
            current: Math.round(avgMargin),
            previous: Math.round(prevAvgMargin),
            change: calcChange(Math.round(avgMargin), Math.round(prevAvgMargin)),
          },
          {
            label: "Total Sold (This Month)",
            current: thisMonthSold,
            previous: prevMonthSold,
            change: calcChange(thisMonthSold, prevMonthSold),
          },
        ];

        reportData = {
          title: "Product Report",
          subtitle: "Product Performance Analytics",
          period: "All Time",
          generatedAt: now.toLocaleString("en-PK"),
          orgName: org.name,
          orgEmail: org.email || undefined,
          brandName: org.name,
          brandColor: org.brandColor || undefined,
          plan: org.plan,
          ...platformInfo,
          stats: [
            { label: "Total Products", value: products.length },
            { label: "Total Sold", value: totalSold },
            { label: "Avg Margin", value: `${Math.round(avgMargin)}%` },
            { label: "Out of Stock", value: outOfStock },
          ],
          tables: [
            {
              title: "Product Catalog",
              headers: ["Product", "Category", "Price", "Qty Sold", "Revenue"],
              rows: productRows.slice(0, 20).map((p) => [
                p.name,
                p.category,
                `${sym} ${p.price.toLocaleString()}`,
                p.qty,
                `${sym} ${p.revenue.toLocaleString()}`,
              ]),
            },
          ],
          summary: summaryText,
          barChartData,
          pieChartData,
          comparison: { previousPeriodLabel: "Previous Month", stats: [
            { label: "Total Products", currentValue: products.length, previousValue: prevTotalProducts, change: calcChange(products.length, prevTotalProducts) },
            { label: "Avg Margin", currentValue: Math.round(avgMargin), previousValue: Math.round(prevAvgMargin), change: calcChange(Math.round(avgMargin), Math.round(prevAvgMargin)) },
            { label: "Total Sold (This Month)", currentValue: thisMonthSold, previousValue: prevMonthSold, change: calcChange(thisMonthSold, prevMonthSold) },
          ]},
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid report type. Use sales, customers, or products." },
          { status: 400 },
        );
    }

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateReportPDF(reportData);
    } catch (pdfErr: any) {
      console.error("[Report Export] PDF generation error:", pdfErr?.message);
      return NextResponse.json(
        { error: "Report PDF generation failed", details: pdfErr?.message },
        { status: 500 },
      );
    }

    if (!pdfBuffer || pdfBuffer.length < 100) {
      return NextResponse.json({ error: "Generated report PDF is invalid" }, { status: 500 });
    }

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${type}-report-${new Date().toISOString().split("T")[0]}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-cache, no-store",
      },
    });
  } catch (error: any) {
    console.error("[Report Export] Unhandled error:", error?.message);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json(
      { error: "Failed to generate report", details: error?.message },
      { status: 500 },
    );
  }
});
