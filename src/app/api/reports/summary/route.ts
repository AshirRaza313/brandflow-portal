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

    return NextResponse.json({
      totalRevenue: totalRevenue._sum.total || 0,
      totalClients,
      activeSubscriptions,
      totalOrders,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}
