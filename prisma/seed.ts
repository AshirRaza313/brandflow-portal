import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const db = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.invoice.deleteMany();
  await db.subscription.deleteMany();
  await db.product.deleteMany();
  await db.client.deleteMany();
  await db.plan.deleteMany();
  await db.admin.deleteMany();

  // Create admin
  const hashedPin = await hash('1234', 10);
  await db.admin.create({
    data: {
      id: 'admin_001',
      name: 'Admin User',
      email: 'admin@brandflow.com',
      pin: hashedPin,
    },
  });
  console.log('✓ Admin created');

  // Create plans
  const plans = await Promise.all([
    db.plan.create({
      data: {
        id: 'plan_001',
        name: 'Starter',
        price: 29,
        features: JSON.stringify(['5 Brands', 'Basic Analytics', 'Email Support', '1 GB Storage']),
        duration: 30,
        status: 'active',
      },
    }),
    db.plan.create({
      data: {
        id: 'plan_002',
        name: 'Professional',
        price: 79,
        features: JSON.stringify(['25 Brands', 'Advanced Analytics', 'Priority Support', '10 GB Storage', 'Custom Reports']),
        duration: 30,
        status: 'active',
      },
    }),
    db.plan.create({
      data: {
        id: 'plan_003',
        name: 'Enterprise',
        price: 199,
        features: JSON.stringify(['Unlimited Brands', 'Full Analytics Suite', '24/7 Support', '100 GB Storage', 'Custom Reports', 'API Access', 'White Label']),
        duration: 30,
        status: 'active',
      },
    }),
  ]);
  console.log('✓ Plans created');

  // Create clients
  const clients = await Promise.all([
    db.client.create({
      data: {
        id: 'client_001',
        name: 'Acme Corporation',
        email: 'contact@acme.com',
        phone: '+1-555-0101',
        company: 'Acme Corp',
        address: '123 Business Ave, New York, NY 10001',
        status: 'active',
      },
    }),
    db.client.create({
      data: {
        id: 'client_002',
        name: 'TechVentures Inc.',
        email: 'info@techventures.io',
        phone: '+1-555-0102',
        company: 'TechVentures',
        address: '456 Tech Blvd, San Francisco, CA 94105',
        status: 'active',
      },
    }),
    db.client.create({
      data: {
        id: 'client_003',
        name: 'GreenLeaf Organics',
        email: 'hello@greenleaf.co',
        phone: '+1-555-0103',
        company: 'GreenLeaf',
        address: '789 Garden St, Portland, OR 97201',
        status: 'active',
      },
    }),
    db.client.create({
      data: {
        id: 'client_004',
        name: 'Stellar Design Studio',
        email: 'team@stellar.design',
        phone: '+1-555-0104',
        company: 'Stellar Design',
        address: '321 Creative Way, Austin, TX 78701',
        status: 'inactive',
      },
    }),
    db.client.create({
      data: {
        id: 'client_005',
        name: 'BlueWave Media',
        email: 'ops@bluewave.media',
        phone: '+1-555-0105',
        company: 'BlueWave',
        address: '654 Media Lane, Chicago, IL 60601',
        status: 'active',
      },
    }),
  ]);
  console.log('✓ Clients created');

  // Create subscriptions
  const now = new Date();
  const subscriptions = await Promise.all([
    db.subscription.create({
      data: {
        id: 'sub_001',
        clientId: 'client_001',
        planId: 'plan_003',
        startDate: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 7, 1),
        status: 'active',
        amount: 199,
      },
    }),
    db.subscription.create({
      data: {
        id: 'sub_002',
        clientId: 'client_002',
        planId: 'plan_002',
        startDate: new Date(now.getFullYear(), now.getMonth() - 3, 15),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
        status: 'active',
        amount: 79,
      },
    }),
    db.subscription.create({
      data: {
        id: 'sub_003',
        clientId: 'client_003',
        planId: 'plan_001',
        startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        endDate: new Date(now.getFullYear(), now.getMonth(), 1),
        status: 'expired',
        amount: 29,
      },
    }),
    db.subscription.create({
      data: {
        id: 'sub_004',
        clientId: 'client_004',
        planId: 'plan_002',
        startDate: new Date(now.getFullYear(), now.getMonth() - 6, 10),
        endDate: new Date(now.getFullYear(), now.getMonth() - 3, 10),
        status: 'cancelled',
        amount: 79,
      },
    }),
    db.subscription.create({
      data: {
        id: 'sub_005',
        clientId: 'client_005',
        planId: 'plan_003',
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 11, 1),
        status: 'active',
        amount: 199,
      },
    }),
  ]);
  console.log('✓ Subscriptions created');

  // Create invoices
  const invoices = await Promise.all([
    db.invoice.create({
      data: {
        id: 'inv_001',
        invoiceNumber: 'INV-2026-001',
        clientId: 'client_001',
        subscriptionId: 'sub_001',
        amount: 199,
        tax: 15.92,
        total: 214.92,
        status: 'paid',
        dueDate: new Date(now.getFullYear(), now.getMonth() - 4, 1),
        paidDate: new Date(now.getFullYear(), now.getMonth() - 4, 1),
        notes: 'Enterprise plan - monthly',
      },
    }),
    db.invoice.create({
      data: {
        id: 'inv_002',
        invoiceNumber: 'INV-2026-002',
        clientId: 'client_001',
        subscriptionId: 'sub_001',
        amount: 199,
        tax: 15.92,
        total: 214.92,
        status: 'paid',
        dueDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
        paidDate: new Date(now.getFullYear(), now.getMonth() - 3, 2),
        notes: 'Enterprise plan - monthly',
      },
    }),
    db.invoice.create({
      data: {
        id: 'inv_003',
        invoiceNumber: 'INV-2026-003',
        clientId: 'client_002',
        subscriptionId: 'sub_002',
        amount: 79,
        tax: 6.32,
        total: 85.32,
        status: 'paid',
        dueDate: new Date(now.getFullYear(), now.getMonth() - 2, 15),
        paidDate: new Date(now.getFullYear(), now.getMonth() - 2, 14),
        notes: 'Professional plan - monthly',
      },
    }),
    db.invoice.create({
      data: {
        id: 'inv_004',
        invoiceNumber: 'INV-2026-004',
        clientId: 'client_002',
        subscriptionId: 'sub_002',
        amount: 79,
        tax: 6.32,
        total: 85.32,
        status: 'pending',
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
        notes: 'Professional plan - monthly',
      },
    }),
    db.invoice.create({
      data: {
        id: 'inv_005',
        invoiceNumber: 'INV-2026-005',
        clientId: 'client_003',
        subscriptionId: 'sub_003',
        amount: 29,
        tax: 2.32,
        total: 31.32,
        status: 'overdue',
        dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        notes: 'Starter plan - monthly',
      },
    }),
    db.invoice.create({
      data: {
        id: 'inv_006',
        invoiceNumber: 'INV-2026-006',
        clientId: 'client_004',
        subscriptionId: 'sub_004',
        amount: 79,
        tax: 6.32,
        total: 85.32,
        status: 'paid',
        dueDate: new Date(now.getFullYear(), now.getMonth() - 5, 10),
        paidDate: new Date(now.getFullYear(), now.getMonth() - 5, 10),
        notes: 'Professional plan - monthly (cancelled)',
      },
    }),
    db.invoice.create({
      data: {
        id: 'inv_007',
        invoiceNumber: 'INV-2026-007',
        clientId: 'client_001',
        subscriptionId: 'sub_001',
        amount: 199,
        tax: 15.92,
        total: 214.92,
        status: 'paid',
        dueDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        paidDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        notes: 'Enterprise plan - monthly',
      },
    }),
    db.invoice.create({
      data: {
        id: 'inv_008',
        invoiceNumber: 'INV-2026-008',
        clientId: 'client_001',
        subscriptionId: 'sub_001',
        amount: 199,
        tax: 15.92,
        total: 214.92,
        status: 'paid',
        dueDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        paidDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        notes: 'Enterprise plan - monthly',
      },
    }),
    db.invoice.create({
      data: {
        id: 'inv_009',
        invoiceNumber: 'INV-2026-009',
        clientId: 'client_005',
        subscriptionId: 'sub_005',
        amount: 199,
        tax: 15.92,
        total: 214.92,
        status: 'paid',
        dueDate: new Date(now.getFullYear(), now.getMonth(), 1),
        paidDate: new Date(now.getFullYear(), now.getMonth(), 1),
        notes: 'Enterprise plan - monthly',
      },
    }),
    db.invoice.create({
      data: {
        id: 'inv_010',
        invoiceNumber: 'INV-2026-010',
        clientId: 'client_005',
        subscriptionId: 'sub_005',
        amount: 199,
        tax: 15.92,
        total: 214.92,
        status: 'pending',
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        notes: 'Enterprise plan - monthly',
      },
    }),
  ]);
  console.log('✓ Invoices created');

  // Create products
  const products = await Promise.all([
    db.product.create({
      data: { id: 'prod_001', name: 'Brand Identity Kit', price: 499, category: 'Design', stock: 50, status: 'active' },
    }),
    db.product.create({
      data: { id: 'prod_002', name: 'Social Media Package', price: 199, category: 'Marketing', stock: 100, status: 'active' },
    }),
    db.product.create({
      data: { id: 'prod_003', name: 'SEO Audit Report', price: 149, category: 'Analytics', stock: 30, status: 'active' },
    }),
    db.product.create({
      data: { id: 'prod_004', name: 'Content Strategy Plan', price: 349, category: 'Marketing', stock: 25, status: 'active' },
    }),
    db.product.create({
      data: { id: 'prod_005', name: 'Logo Redesign', price: 299, category: 'Design', stock: 40, status: 'active' },
    }),
  ]);
  console.log('✓ Products created');

  // Create orders with items
  const ordersData = [
    { clientId: 'client_001', total: 996, status: 'completed', items: [{ pid: 'prod_001', qty: 1, price: 499 }, { pid: 'prod_002', qty: 1, price: 199 }, { pid: 'prod_003', qty: 2, price: 149 }] },
    { clientId: 'client_001', total: 349, status: 'completed', items: [{ pid: 'prod_004', qty: 1, price: 349 }] },
    { clientId: 'client_002', total: 647, status: 'completed', items: [{ pid: 'prod_001', qty: 1, price: 499 }, { pid: 'prod_003', qty: 1, price: 149 }] },
    { clientId: 'client_002', total: 598, status: 'completed', items: [{ pid: 'prod_005', qty: 2, price: 299 }] },
    { clientId: 'client_003', total: 199, status: 'completed', items: [{ pid: 'prod_002', qty: 1, price: 199 }] },
    { clientId: 'client_003', total: 448, status: 'completed', items: [{ pid: 'prod_003', qty: 1, price: 149 }, { pid: 'prod_004', qty: 1, price: 299 }] },
    { clientId: 'client_004', total: 299, status: 'cancelled', items: [{ pid: 'prod_005', qty: 1, price: 299 }] },
    { clientId: 'client_004', total: 798, status: 'completed', items: [{ pid: 'prod_001', qty: 1, price: 499 }, { pid: 'prod_002', qty: 1, price: 199 }, { pid: 'prod_003', qty: 1, price: 149 }] },
    { clientId: 'client_005', total: 199, status: 'completed', items: [{ pid: 'prod_002', qty: 1, price: 199 }] },
    { clientId: 'client_005', total: 946, status: 'completed', items: [{ pid: 'prod_001', qty: 1, price: 499 }, { pid: 'prod_004', qty: 1, price: 349 }, { pid: 'prod_005', qty: 1, price: 299 }] },
    { clientId: 'client_001', total: 548, status: 'completed', items: [{ pid: 'prod_004', qty: 1, price: 349 }, { pid: 'prod_005', qty: 1, price: 299 }] },
    { clientId: 'client_002', total: 299, status: 'pending', items: [{ pid: 'prod_005', qty: 1, price: 299 }] },
    { clientId: 'client_003', total: 647, status: 'completed', items: [{ pid: 'prod_001', qty: 1, price: 499 }, { pid: 'prod_003', qty: 1, price: 149 }] },
    { clientId: 'client_005', total: 448, status: 'completed', items: [{ pid: 'prod_003', qty: 1, price: 149 }, { pid: 'prod_004', qty: 1, price: 349 }] },
    { clientId: 'client_001', total: 199, status: 'completed', items: [{ pid: 'prod_002', qty: 1, price: 199 }] },
  ];

  for (let i = 0; i < ordersData.length; i++) {
    const od = ordersData[i];
    const monthOffset = Math.floor(i / 3);
    const dayOffset = (i % 28) + 1;
    const order = await db.order.create({
      data: {
        id: `order_${String(i + 1).padStart(3, '0')}`,
        clientId: od.clientId,
        total: od.total,
        status: od.status,
        createdAt: new Date(now.getFullYear(), now.getMonth() - monthOffset, dayOffset),
      },
    });

    for (const item of od.items) {
      await db.orderItem.create({
        data: {
          id: uuidv4(),
          orderId: order.id,
          productId: item.pid,
          quantity: item.qty,
          price: item.price,
          total: item.qty * item.price,
        },
      });
    }
  }
  console.log('✓ Orders created');

  console.log('\n✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
