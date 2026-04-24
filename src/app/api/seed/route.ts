import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

export const POST = withAuth(async (req: NextRequest, authCtx) => {
  logger.info("[Seed] POST request", { userId: authCtx.userId });
  try {
    // Check if demo data already exists
    const existingUser = await db.user.findUnique({ where: { email: "john@demo.com" } });
    if (existingUser) {
      return NextResponse.json({ message: "Demo data already seeded" });
    }

    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash("password123", 12);

    // Create demo organization
    const org = await db.organization.create({
      data: {
        name: "Demo Brand",
        slug: "demo-brand",
        email: "hello@demobrand.com",
        phone: "+1 (555) 123-4567",
        website: "https://demobrand.com",
        currency: "USD",
        timezone: "America/New_York",
        plan: "growth",
      },
    });

    // Create demo user
    const user = await db.user.create({
      data: {
        name: "John Doe",
        email: "john@demo.com",
        password: hashedPassword,
        role: "owner",
      },
    });

    await db.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "owner",
      },
    });

    // Create team members
    const teamMembers = [
      { name: "Sarah Johnson", email: "sarah@demo.com", role: "admin" },
      { name: "Mike Chen", email: "mike@demo.com", role: "manager" },
      { name: "Emily Wilson", email: "emily@demo.com", role: "sales" },
      { name: "David Kim", email: "david@demo.com", role: "support" },
      { name: "Lisa Park", email: "lisa@demo.com", role: "inventory" },
    ];

    const teamUsers: { id: string; name: string; role: string }[] = [{ id: user.id, name: "John Doe", role: "owner" }];

    for (const member of teamMembers) {
      const u = await db.user.create({
        data: {
          name: member.name,
          email: member.email,
          password: hashedPassword,
          role: member.role,
        },
      });
      await db.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: u.id,
          role: member.role,
        },
      });
      teamUsers.push({ id: u.id, name: member.name, role: member.role });
    }

    // Create products
    const productsData = [
      { name: "Premium Face Serum", sku: "PFS-001", price: 45.99, costPrice: 18.00, stock: 120, category: "Skincare" },
      { name: "Organic Lip Balm", sku: "OLB-002", price: 12.99, costPrice: 3.50, stock: 250, category: "Lip Care" },
      { name: "Hydrating Moisturizer", sku: "HM-003", price: 38.50, costPrice: 14.00, stock: 85, category: "Skincare" },
      { name: "Gentle Cleanser", sku: "GC-004", price: 22.00, costPrice: 8.00, stock: 200, category: "Skincare" },
      { name: "Vitamin C Brightening Cream", sku: "VCB-005", price: 52.00, costPrice: 20.00, stock: 5, category: "Skincare" },
      { name: "Rose Hip Oil", sku: "RHO-006", price: 29.99, costPrice: 12.00, stock: 3, category: "Oils" },
      { name: "Sunscreen SPF 50", sku: "SS-007", price: 35.00, costPrice: 13.50, stock: 150, category: "Sun Care" },
      { name: "Eye Cream Anti-Aging", sku: "ECA-008", price: 48.00, costPrice: 19.00, stock: 8, category: "Eye Care" },
      { name: "Body Lotion Lavender", sku: "BLL-009", price: 18.99, costPrice: 6.50, stock: 300, category: "Body Care" },
      { name: "Charcoal Face Mask", sku: "CFM-010", price: 15.99, costPrice: 5.00, stock: 175, category: "Masks" },
    ];

    const products = [];
    for (const p of productsData) {
      const product = await db.product.create({
        data: { ...p, organizationId: org.id },
      });
      products.push(product);
    }

    // Create customers
    const customersData = [
      { name: "Alice Thompson", email: "alice@email.com", phone: "+1 555-1001", city: "New York", loyaltyTier: "gold", totalSpent: 5420, orderCount: 12 },
      { name: "Bob Martinez", email: "bob@email.com", phone: "+1 555-1002", city: "Los Angeles", loyaltyTier: "gold", totalSpent: 6100, orderCount: 15 },
      { name: "Carol White", email: "carol@email.com", phone: "+1 555-1003", city: "Chicago", loyaltyTier: "silver", totalSpent: 1850, orderCount: 7 },
      { name: "Daniel Lee", email: "daniel@email.com", phone: "+1 555-1004", city: "Houston", loyaltyTier: "silver", totalSpent: 1200, orderCount: 5 },
      { name: "Eva Brown", email: "eva@email.com", phone: "+1 555-1005", city: "Phoenix", loyaltyTier: "bronze", totalSpent: 450, orderCount: 3 },
      { name: "Frank Garcia", email: "frank@email.com", phone: "+1 555-1006", city: "San Antonio", loyaltyTier: "bronze", totalSpent: 380, orderCount: 2 },
      { name: "Grace Kim", email: "grace@email.com", phone: "+1 555-1007", city: "San Diego", loyaltyTier: "silver", totalSpent: 2100, orderCount: 8 },
      { name: "Henry Wang", email: "henry@email.com", phone: "+1 555-1008", city: "Dallas", loyaltyTier: "new", totalSpent: 0, orderCount: 0 },
      { name: "Irene Davis", email: "irene@email.com", phone: "+1 555-1009", city: "San Jose", loyaltyTier: "new", totalSpent: 0, orderCount: 0 },
      { name: "James Taylor", email: "james@email.com", phone: "+1 555-1010", city: "Austin", loyaltyTier: "bronze", totalSpent: 520, orderCount: 2 },
      { name: "Karen Lopez", email: "karen@email.com", phone: "+1 555-1011", city: "Jacksonville", loyaltyTier: "silver", totalSpent: 1650, orderCount: 6 },
      { name: "Leo Nguyen", email: "leo@email.com", phone: "+1 555-1012", city: "Fort Worth", loyaltyTier: "bronze", totalSpent: 310, orderCount: 2 },
      { name: "Mia Anderson", email: "mia@email.com", phone: "+1 555-1013", city: "Columbus", loyaltyTier: "new", totalSpent: 0, orderCount: 0 },
      { name: "Noah Clark", email: "noah@email.com", phone: "+1 555-1014", city: "Charlotte", loyaltyTier: "bronze", totalSpent: 280, orderCount: 2 },
      { name: "Olivia Hall", email: "olivia@email.com", phone: "+1 555-1015", city: "Denver", loyaltyTier: "silver", totalSpent: 1450, orderCount: 5 },
    ];

    const customers = [];
    for (const c of customersData) {
      const customer = await db.customer.create({
        data: { ...c, organizationId: org.id },
      });
      customers.push(customer);
    }

    // Create orders
    const statuses = ["pending", "confirmed", "packed", "dispatched", "delivered", "cancelled"];
    const channels = ["website", "whatsapp", "instagram", "manual"];
    const now = new Date();
    let orderCounter = 1;

    for (let i = 0; i < 25; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const status = statuses[Math.floor(Math.random() * (statuses.length - 1))]; // less cancellations
      const channel = channels[Math.floor(Math.random() * channels.length)];
      const numItems = Math.floor(Math.random() * 3) + 1;
      let subtotal = 0;

      const orderItems = [];
      const usedProducts = new Set<number>();

      for (let j = 0; j < numItems; j++) {
        let productIdx = Math.floor(Math.random() * products.length);
        while (usedProducts.has(productIdx)) productIdx = Math.floor(Math.random() * products.length);
        usedProducts.add(productIdx);

        const product = products[productIdx];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const itemTotal = product.price * quantity;
        subtotal += itemTotal;

        orderItems.push({
          productId: product.id,
          productName: product.name,
          quantity,
          price: product.price,
          total: itemTotal,
        });
      }

      const discount = Math.random() > 0.7 ? subtotal * 0.1 : 0;
      const total = subtotal - discount;
      const orderDate = new Date(now);
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30));

      const order = await db.order.create({
        data: {
          orderNumber: `BFR-${String(orderCounter++).padStart(4, "0")}`,
          organizationId: org.id,
          customerId: customer.id,
          status,
          subtotal,
          discount,
          total,
          channel,
          notes: Math.random() > 0.8 ? "Gift wrapping requested" : null,
          createdAt: orderDate,
          updatedAt: orderDate,
          items: {
            create: orderItems,
          },
        },
      });

      // Update customer stats
      if (status !== "cancelled") {
        await db.customer.update({
          where: { id: customer.id },
          data: {
            totalSpent: { increment: total },
            orderCount: { increment: 1 },
          },
        });
      }
    }

    // Create expenses
    const expenseCategories = ["marketing", "operations", "salaries", "rent", "utilities", "shipping", "other"];
    const expenseData = [
      { title: "Social Media Ads", amount: 500, category: "marketing" },
      { title: "Office Rent", amount: 2000, category: "rent" },
      { title: "Team Salaries", amount: 8000, category: "salaries" },
      { title: "Electric Bill", amount: 250, category: "utilities" },
      { title: "Shipping Supplies", amount: 350, category: "shipping" },
      { title: "Influencer Partnership", amount: 1200, category: "marketing" },
      { title: "Software Subscription", amount: 99, category: "operations" },
      { title: "Packaging Materials", amount: 180, category: "operations" },
    ];

    for (const e of expenseData) {
      const expDate = new Date(now);
      expDate.setDate(expDate.getDate() - Math.floor(Math.random() * 30));
      await db.expense.create({
        data: {
          ...e,
          date: expDate,
          organizationId: org.id,
        },
      });
    }

    // Create tasks
    const taskData = [
      { title: "Update product photos for summer collection", status: "done", priority: "high", assignedTo: teamUsers[4]?.id },
      { title: "Respond to customer complaints", status: "in_progress", priority: "urgent", assignedTo: teamUsers[3]?.id },
      { title: "Prepare monthly sales report", status: "todo", priority: "medium", assignedTo: teamUsers[2]?.id },
      { title: "Restock low inventory items", status: "in_progress", priority: "high", assignedTo: teamUsers[4]?.id },
      { title: "Design new promotional banners", status: "todo", priority: "low", assignedTo: null },
      { title: "Review and update pricing", status: "todo", priority: "medium", assignedTo: teamUsers[1]?.id },
      { title: "Set up email marketing campaign", status: "todo", priority: "medium", assignedTo: teamUsers[0]?.id },
      { title: "Onboard new team member", status: "done", priority: "high", assignedTo: teamUsers[0]?.id },
    ];

    for (const t of taskData) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14));
      await db.teamTask.create({
        data: {
          ...t,
          dueDate: t.status === "done" ? new Date(now.getTime() - 86400000) : dueDate,
          organizationId: org.id,
        },
      });
    }

    // Create coupons
    const couponData = [
      { code: "WELCOME10", type: "percentage", value: 10, minOrder: 25, usageLimit: 100 },
      { code: "SUMMER25", type: "percentage", value: 25, minOrder: 50, usageLimit: 50 },
      { code: "FREESHIP", type: "fixed", value: 5, minOrder: 30, usageLimit: 200 },
      { code: "LOYALTY15", type: "percentage", value: 15, minOrder: 0, usageLimit: 0 },
    ];

    for (const c of couponData) {
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 30);
      await db.coupon.create({
        data: {
          ...c,
          usageCount: Math.floor(Math.random() * 20),
          expiresAt,
          organizationId: org.id,
        },
      });
    }

    // Create attendance records for the last 15 days
    for (const member of [user, ...teamMembers.slice(0, 3)]) {
      // Get the actual user record
      const u = await db.user.findFirst({ where: { email: member.email } });
      if (!u) continue;

      for (let d = 0; d < 15; d++) {
        const date = new Date(now);
        date.setDate(date.getDate() - d);
        date.setHours(0, 0, 0, 0);

        if (Math.random() > 0.1) { // 90% attendance
          const clockIn = new Date(date);
          clockIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 30));
          const clockOut = new Date(clockIn);
          clockOut.setHours(clockIn.getHours() + 8 + Math.floor(Math.random() * 2));
          const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

          await db.attendance.create({
            data: {
              userId: u.id,
              date,
              clockIn,
              clockOut,
              totalHours: Math.round(totalHours * 10) / 10,
              status: clockIn.getHours() >= 9 ? "late" : "present",
            },
          });
        } else {
          await db.attendance.create({
            data: {
              userId: u.id,
              date,
              status: "absent",
            },
          });
        }
      }
    }

    // Migrate old roles to new system
    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    if (adminEmail) {
      const adminUser = await db.user.findUnique({ where: { email: adminEmail } });
      if (adminUser) {
        await db.user.update({ where: { email: adminEmail }, data: { role: "platform_owner" } });
        const adminMember = await db.organizationMember.findFirst({ where: { userId: adminUser.id } });
        if (adminMember) {
          await db.organizationMember.update({ where: { id: adminMember.id }, data: { role: "platform_owner" } });
        }
      }
    }
    await db.user.updateMany({ where: { role: "owner", email: { not: adminEmail ? adminEmail : "__none__" } }, data: { role: "brand_owner" } });
    await db.organizationMember.updateMany({ where: { role: "owner" }, data: { role: "brand_owner" } });

    return NextResponse.json({
      message: "Demo data seeded successfully",
      credentials: { email: "john@demo.com", password: "password123" },
    });
  } catch (error: any) {
    logger.error("Seed error", error);
    return NextResponse.json({ error: "Seed failed: " + error.message }, { status: 500 });
  }
}, { requireRole: ["platform_owner", "platform_admin", "admin"], requireOrg: false });
