import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, validateToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || !validateToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const clientId = searchParams.get('clientId') || '';

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;

    const subscriptions = await db.subscription.findMany({
      where,
      include: { client: true, plan: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(subscriptions);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || !validateToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { clientId, planId, startDate, duration } = body;

    if (!clientId || !planId) {
      return NextResponse.json({ error: 'Client and plan are required' }, { status: 400 });
    }

    const plan = await db.plan.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const start = startDate ? new Date(startDate) : new Date();
    const dur = duration || plan.duration;
    const end = new Date(start);
    end.setDate(end.getDate() + dur);

    const subscription = await db.subscription.create({
      data: {
        clientId,
        planId,
        startDate: start,
        endDate: end,
        status: 'active',
        amount: plan.price,
      },
      include: { client: true, plan: true },
    });

    // Auto-generate invoice
    const invoiceCount = await db.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, '0')}`;
    const tax = plan.price * 0.08;
    const total = plan.price + tax;

    await db.invoice.create({
      data: {
        invoiceNumber,
        clientId,
        subscriptionId: subscription.id,
        amount: plan.price,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(total * 100) / 100,
        status: 'pending',
        dueDate: end,
        notes: `${plan.name} plan subscription`,
      },
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}
