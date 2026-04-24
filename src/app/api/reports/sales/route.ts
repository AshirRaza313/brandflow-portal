import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, validateToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || !validateToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const monthlyRevenue: { month: string; revenue: number; orders: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthName = monthStart.toLocaleString('default', { month: 'short', year: '2-digit' });

      const invoiceRevenue = await db.invoice.aggregate({
        _sum: { total: true },
        where: {
          status: 'paid',
          paidDate: { gte: monthStart, lte: monthEnd },
        },
      });

      const orderCount = await db.order.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
      });

      monthlyRevenue.push({
        month: monthName,
        revenue: invoiceRevenue._sum.total || 0,
        orders: orderCount,
      });
    }

    // Top clients by revenue
    const topClients = await db.client.findMany({
      take: 5,
      include: {
        invoices: { where: { status: 'paid' }, select: { total: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const topClientsRevenue = topClients.map((c) => ({
      name: c.name,
      revenue: c.invoices.reduce((sum, inv) => sum + inv.total, 0),
    }));

    return NextResponse.json({ monthlyRevenue, topClients: topClientsRevenue });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 });
  }
}
