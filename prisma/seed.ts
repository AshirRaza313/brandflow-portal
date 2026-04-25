import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Create platform settings
  const settings = await db.platformSettings.create({
    data: {
      companyName: 'Valtriox',
      companyEmail: 'support@valtriox.com',
      companyPhone: '+92-300-1234567',
      companyWebsite: 'https://valtriox.vercel.app',
      companyAddress: 'Lahore, Pakistan',
      supportHours: 'Mon-Fri: 9AM-6PM PKT',
      whatsappNumber: '+923001234567',
      instagramUrl: '@valtriox',
      facebookUrl: 'valtriox',
      twitterUrl: '@valtriox',
      paymentMethods: JSON.stringify(['Bank Transfer', 'JazzCash', 'EasyPaisa', 'Credit Card']),
      currency: 'PKR',
      primaryBrandColor: '#C9A227',
      secondaryBrandColor: '#B8860B',
      currencySymbol: 'Rs.',
      tagline: "The Universal Brand Management Portal",
    },
  });
  console.log('✅ Platform settings created');

  // 2. Create subscription plans
  const starter = await db.subscriptionPlan.create({
    data: {
      name: 'Starter',
      price: 0,
      annualPrice: 0,
      features: JSON.stringify(['5 Products', '50 Orders/month', 'Basic Reports', 'Email Support', '1 Team Member']),
      teamLimit: 1,
      orderLimit: 50,
      productLimit: 5,
      trialDays: 14,
      isActive: true,
    },
  });

  const growth = await db.subscriptionPlan.create({
    data: {
      name: 'Growth',
      price: 2999,
      annualPrice: 29990,
      features: JSON.stringify(['50 Products', '500 Orders/month', 'Advanced Reports', 'Priority Support', '5 Team Members', 'Coupons & Discounts', 'Customer Loyalty', 'Marketing Tools']),
      teamLimit: 5,
      orderLimit: 500,
      productLimit: 50,
      trialDays: 14,
      isActive: true,
    },
  });

  const enterprise = await db.subscriptionPlan.create({
    data: {
      name: 'Enterprise',
      price: 7999,
      annualPrice: 79990,
      features: JSON.stringify(['Unlimited Products', 'Unlimited Orders', 'Full Analytics Suite', '24/7 Support', 'Unlimited Team', 'AI Tools', 'Custom Integrations', 'White-label Reports', 'API Access', 'SLA Engine']),
      teamLimit: -1,
      orderLimit: -1,
      productLimit: -1,
      trialDays: 30,
      isActive: true,
    },
  });
  console.log('✅ Subscription plans created');

  // 3. Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await db.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@valtriox.com',
      password: hashedPassword,
      role: 'platform_owner',
    },
  });
  console.log('✅ Admin user created');

  // 4. Create demo organization
  const org = await db.organization.create({
    data: {
      name: 'Demo Store',
      slug: 'demo-store',
      email: 'info@demostore.pk',
      phone: '+92-300-9876543',
      website: 'https://demostore.pk',
      currency: 'PKR',
      timezone: 'Asia/Karachi',
      plan: 'growth',
      country: 'Pakistan',
      brandColor: '#C9A227',
      address: '123 Main Market, Lahore',
      isActive: true,
    },
  });
  console.log('✅ Demo organization created');

  // 5. Add admin as org member
  await db.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: admin.id,
      role: 'owner',
    },
  });

  // 6. Create subscription for org
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  await db.subscription.create({
    data: {
      organizationId: org.id,
      planId: growth.id,
      status: 'active',
      billingCycle: 'monthly',
      trialStartsAt: new Date(),
      trialEndsAt: trialEnd,
      currentPeriodEnd: thirtyDaysFromNow,
    },
  });
  console.log('✅ Subscription created');

  // 7. Create sample customers
  const customers = [
    { name: 'Ahmed Khan', email: 'ahmed@email.com', phone: '+92-300-1111111', city: 'Lahore', loyaltyTier: 'gold', totalSpent: 45000, orderCount: 12 },
    { name: 'Sara Ali', email: 'sara@email.com', phone: '+92-300-2222222', city: 'Karachi', loyaltyTier: 'silver', totalSpent: 28000, orderCount: 8 },
    { name: 'Usman Malik', email: 'usman@email.com', phone: '+92-300-3333333', city: 'Islamabad', loyaltyTier: 'bronze', totalSpent: 12000, orderCount: 4 },
    { name: 'Fatima Noor', email: 'fatima@email.com', phone: '+92-300-4444444', city: 'Lahore', loyaltyTier: 'gold', totalSpent: 67000, orderCount: 18 },
    { name: 'Hassan Raza', email: 'hassan@email.com', phone: '+92-300-5555555', city: 'Rawalpindi', loyaltyTier: 'new', totalSpent: 5000, orderCount: 2 },
  ];

  const createdCustomers = [];
  for (const c of customers) {
    const customer = await db.customer.create({
      data: { ...c, organizationId: org.id },
    });
    createdCustomers.push(customer);
  }
  console.log(`✅ ${customers.length} customers created`);

  // 8. Create sample products
  const products = [
    { name: 'Premium Lawn Suit', sku: 'PLS-001', price: 5500, costPrice: 2800, stock: 45, category: 'Clothing' },
    { name: 'Embroidered Shawl', sku: 'ES-002', price: 3200, costPrice: 1500, stock: 30, category: 'Accessories' },
    { name: 'Silk Dupatta', sku: 'SD-003', price: 1800, costPrice: 800, stock: 60, category: 'Accessories' },
    { name: 'Cotton Kurti', sku: 'CK-004', price: 2200, costPrice: 900, stock: 80, category: 'Clothing' },
    { name: 'Formal Shoes', sku: 'FS-005', price: 8500, costPrice: 4500, stock: 15, category: 'Footwear' },
    { name: 'Leather Wallet', sku: 'LW-006', price: 1500, costPrice: 600, stock: 100, category: 'Accessories' },
    { name: 'Watch - Classic', sku: 'WC-007', price: 12000, costPrice: 6000, stock: 8, category: 'Accessories' },
    { name: 'Perfume - Oud', sku: 'PO-008', price: 4500, costPrice: 2000, stock: 25, category: 'Fragrance' },
  ];

  const createdProducts = [];
  for (const p of products) {
    const product = await db.product.create({
      data: { ...p, organizationId: org.id },
    });
    createdProducts.push(product);
  }
  console.log(`✅ ${products.length} products created`);

  // 9. Create sample orders with items
  const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'delivered', 'delivered', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'cancelled'];
  let orderCounter = 1001;

  for (let i = 0; i < 15; i++) {
    const customer = createdCustomers[i % createdCustomers.length];
    const numItems = Math.floor(Math.random() * 3) + 1;
    const selectedProducts = [];
    for (let j = 0; j < numItems; j++) {
      selectedProducts.push(createdProducts[Math.floor(Math.random() * createdProducts.length)]);
    }

    const subtotal = selectedProducts.reduce((sum, p) => sum + p.price, 0);
    const discount = Math.random() > 0.7 ? subtotal * 0.1 : 0;
    const total = subtotal - discount;
    const daysAgo = Math.floor(Math.random() * 60);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    const order = await db.order.create({
      data: {
        orderNumber: `ORD-${String(orderCounter++).padStart(5, '0')}`,
        organizationId: org.id,
        customerId: customer.id,
        status: orderStatuses[i % orderStatuses.length],
        subtotal,
        discount,
        total,
        channel: Math.random() > 0.5 ? 'whatsapp' : 'manual',
        createdAt,
      },
    });

    for (const prod of selectedProducts) {
      const qty = Math.floor(Math.random() * 3) + 1;
      await db.orderItem.create({
        data: {
          orderId: order.id,
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          price: prod.price,
          total: prod.price * qty,
        },
      });
    }
  }
  console.log('✅ 15 orders with items created');

  // 10. Create invoices
  let invoiceCounter = 1;
  const invoiceData = [
    { planName: 'Growth', amount: 2999, billingCycle: 'monthly', status: 'paid', monthsAgo: 6 },
    { planName: 'Growth', amount: 2999, billingCycle: 'monthly', status: 'paid', monthsAgo: 5 },
    { planName: 'Growth', amount: 2999, billingCycle: 'monthly', status: 'paid', monthsAgo: 4 },
    { planName: 'Growth', amount: 2999, billingCycle: 'monthly', status: 'paid', monthsAgo: 3 },
    { planName: 'Growth', amount: 2999, billingCycle: 'monthly', status: 'paid', monthsAgo: 2 },
    { planName: 'Growth', amount: 2999, billingCycle: 'monthly', status: 'paid', monthsAgo: 1 },
    { planName: 'Growth', amount: 2999, billingCycle: 'monthly', status: 'paid', monthsAgo: 0 },
    { planName: 'Growth', amount: 2999, billingCycle: 'monthly', status: 'pending', monthsAgo: 0 },
  ];

  for (const inv of invoiceData) {
    const issuedAt = new Date();
    issuedAt.setMonth(issuedAt.getMonth() - inv.monthsAgo);

    const dueDate = new Date(issuedAt);
    dueDate.setDate(dueDate.getDate() + 15);

    const invoiceNum = `VTX-${issuedAt.getFullYear()}-${String(invoiceCounter++).padStart(4, '0')}`;

    await db.invoice.create({
      data: {
        invoiceNumber: invoiceNum,
        organizationId: org.id,
        planName: inv.planName,
        amount: inv.amount,
        billingCycle: inv.billingCycle,
        status: inv.status,
        currencyCode: 'PKR',
        currencySymbol: 'Rs.',
        issuedAt,
        dueDate,
        paidAt: inv.status === 'paid' ? new Date(issuedAt.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
        orgName: org.name,
        orgEmail: org.email,
        orgPhone: org.phone,
        orgAddress: org.address,
      },
    });
  }
  console.log(`✅ ${invoiceData.length} invoices created`);

  // 11. Create roles
  await db.role.create({
    data: { name: 'owner', label: 'Owner', description: 'Full access to everything', permissions: '{}', level: 100 },
  });
  await db.role.create({
    data: { name: 'manager', label: 'Manager', description: 'Can manage most features', permissions: '{}', level: 80 },
  });
  await db.role.create({
    data: { name: 'member', label: 'Team Member', description: 'Basic access', permissions: '{}', level: 50 },
  });
  console.log('✅ Roles created');

  // 12. Create system settings
  await db.systemSetting.create({ data: { key: 'platform_version', value: '3.0.0', category: 'system' } });
  await db.systemSetting.create({ data: { key: 'last_cron_run', value: new Date().toISOString(), category: 'system' } });
  console.log('✅ System settings created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📧 Login credentials: admin@valtriox.com / Admin@123');
  console.log('🏪 Demo org: Demo Store');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
