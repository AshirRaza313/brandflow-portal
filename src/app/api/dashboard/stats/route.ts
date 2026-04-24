import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, validateToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || !validateToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const totalRevenue = await db.invoice.aggregate({
      _sum: { total: true },
      where: { status: 'paid' },
    });

    const totalClients = await db.client.count();
    const activeSubscriptions = await db.subscription.count({ where: { status: 'active' } });
    const totalOrders = await db.order.count();
    const totalInvoices = await db.invoice.count();

    const pendingInvoices = await db.invoice.count({ where: { status: 'pending' } });
    const overdueInvoices = await db.invoice.count({ where: { status: 'overdue' } });

    const recentOrders = await db.order.findMany({
      take: 5,
      include: { client: true, orderItems: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const recentSubscriptions = await db.subscription.findMany({
      take: 5,
      include: { client: true, plan: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      totalRevenue: totalRevenue._sum.total || 0,
      totalClients,
      activeSubscriptions,
      totalOrders,
      totalInvoices,
      pendingInvoices,
      overdueInvoices,
      recentOrders,
      recentSubscriptions,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
