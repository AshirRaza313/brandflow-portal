import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, validateToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || !validateToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orders = await db.order.findMany({
      include: {
        client: true,
        orderItems: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token || !validateToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { clientId, items } = body;

    if (!clientId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Client and items are required' }, { status: 400 });
    }

    let total = 0;
    for (const item of items) {
      const product = await db.product.findUnique({ where: { id: item.productId } });
      if (!product) return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
      total += product.price * item.quantity;
    }

    const order = await db.order.create({
      data: {
        clientId,
        total: Math.round(total * 100) / 100,
        status: 'completed',
      },
    });

    for (const item of items) {
      const product = await db.product.findUnique({ where: { id: item.productId } });
      await db.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: product!.price,
          total: product!.price * item.quantity,
        },
      });
    }

    const result = await db.order.findUnique({
      where: { id: order.id },
      include: { client: true, orderItems: { include: { product: true } } },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
