import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, validateToken } from '@/lib/auth';

function checkAuth(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return validateToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const auth = checkAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const clients = await db.client.findMany({
      where,
      include: {
        _count: { select: { subscriptions: true, invoices: true, orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = checkAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, email, phone, company, address } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const existing = await db.client.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Client with this email already exists' }, { status: 409 });
    }

    const client = await db.client.create({
      data: { name, email, phone, company, address, status: 'active' },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
