import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, validateToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || !validateToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const plans = await db.plan.findMany({
      include: { _count: { select: { subscriptions: true } } },
      orderBy: { price: 'asc' },
    });

    return NextResponse.json(plans);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || !validateToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, price, features, duration } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    const plan = await db.plan.create({
      data: {
        name,
        price: parseFloat(price),
        features: JSON.stringify(features || []),
        duration: parseInt(duration) || 30,
        status: 'active',
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}
