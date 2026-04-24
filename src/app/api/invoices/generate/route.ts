import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, validateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || !validateToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { clientId, subscriptionId, amount, tax, notes } = body;

    if (!clientId || amount === undefined) {
      return NextResponse.json({ error: 'Client and amount are required' }, { status: 400 });
    }

    const invoiceCount = await db.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, '0')}`;
    const taxAmount = tax || 0;
    const total = amount + taxAmount;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        clientId,
        subscriptionId: subscriptionId || null,
        amount,
        tax: taxAmount,
        total: Math.round(total * 100) / 100,
        status: 'pending',
        dueDate,
        notes: notes || '',
      },
      include: { client: true },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
