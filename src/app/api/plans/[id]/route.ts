import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, validateToken } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || !validateToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    if (body.features && Array.isArray(body.features)) {
      body.features = JSON.stringify(body.features);
    }

    const plan = await db.plan.update({ where: { id }, data: body });
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || !validateToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const subCount = await db.subscription.count({ where: { planId: id } });
    if (subCount > 0) {
      return NextResponse.json({ error: 'Cannot delete plan with active subscriptions' }, { status: 400 });
    }

    await db.plan.delete({ where: { id } });
    return NextResponse.json({ message: 'Plan deleted' });
  } catch {
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}
