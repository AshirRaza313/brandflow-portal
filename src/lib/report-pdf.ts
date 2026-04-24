import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '@/lib/db';

const DARK = '#1a1a2e';
const GOLD = '#d4af37';
const WHITE = '#ffffff';
const LIGHT_GRAY = '#f8f9fa';
const MID_GRAY = '#6b7280';
const DARK_GRAY = '#374151';

export async function generateReportPDF(
  type: string,
  dateFrom: string,
  dateTo: string
): Promise<Uint8Array> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const fromDate = dateFrom ? new Date(dateFrom) : new Date(new Date().getFullYear(), 0, 1);
  const toDate = dateTo ? new Date(dateTo) : new Date();
  toDate.setHours(23, 59, 59, 999);

  const reportTypeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const dateRange = `${fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — ${toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // ===== HEADER =====
  doc.setFillColor(DARK);
  doc.rect(0, 0, pageWidth, 55, 'F');

  doc.setFillColor(GOLD);
  doc.rect(0, 55, pageWidth, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(WHITE);
  doc.text('BrandFlow', 20, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text('Premium Brand Management Platform', 20, 35);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(GOLD);
  doc.text(`${reportTypeLabel} Report`, 20, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(WHITE);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth - 20, 25, { align: 'right' });
  doc.text(dateRange, pageWidth - 20, 35, { align: 'right' });

  // ===== SUMMARY SECTION =====
  let y = 75;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(DARK);
  doc.text('Executive Summary', 20, y);
  y += 5;
  doc.setFillColor(GOLD);
  doc.rect(20, y, 40, 1.5, 'F');
  y += 12;

  let summaryData: { label: string; value: string }[] = [];

  switch (type) {
    case 'sales': {
      const invoices = await db.invoice.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
      });
      const paidTotal = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
      const orderCount = await db.order.count({ where: { createdAt: { gte: fromDate, lte: toDate } } });
      const orderTotal = await db.order.findMany({ where: { createdAt: { gte: fromDate, lte: toDate } } });
      const orderRevenue = orderTotal.reduce((s, o) => s + o.total, 0);

      summaryData = [
        { label: 'Total Invoice Revenue', value: `$${paidTotal.toFixed(2)}` },
        { label: 'Total Invoices', value: String(invoices.length) },
        { label: 'Total Orders', value: String(orderCount) },
        { label: 'Order Revenue', value: `$${orderRevenue.toFixed(2)}` },
      ];
      break;
    }
    case 'clients': {
      const clients = await db.client.count({ where: { createdAt: { gte: fromDate, lte: toDate } } });
      const activeSubs = await db.subscription.count({ where: { startDate: { gte: fromDate, lte: toDate }, status: 'active' } });
      const totalClients = await db.client.count();
      summaryData = [
        { label: 'New Clients', value: String(clients) },
        { label: 'Total Clients', value: String(totalClients) },
        { label: 'New Active Subscriptions', value: String(activeSubs) },
        { label: 'Client Growth Rate', value: totalClients > 0 ? `${((clients / totalClients) * 100).toFixed(1)}%` : '0%' },
      ];
      break;
    }
    case 'revenue': {
      const paidInv = await db.invoice.findMany({ where: { status: 'paid', paidDate: { gte: fromDate, lte: toDate } } });
      const revenue = paidInv.reduce((s, i) => s + i.total, 0);
      const tax = paidInv.reduce((s, i) => s + i.tax, 0);
      const avgInvoice = paidInv.length > 0 ? revenue / paidInv.length : 0;
      summaryData = [
        { label: 'Total Revenue', value: `$${revenue.toFixed(2)}` },
        { label: 'Total Tax Collected', value: `$${tax.toFixed(2)}` },
        { label: 'Paid Invoices', value: String(paidInv.length) },
        { label: 'Avg Invoice Amount', value: `$${avgInvoice.toFixed(2)}` },
      ];
      break;
    }
    case 'products': {
      const products = await db.product.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: { orderItems: true },
      });
      const totalOrders = await db.orderItem.count();
      summaryData = [
        { label: 'Products Added', value: String(products.length) },
        { label: 'Total Products', value: String(await db.product.count()) },
        { label: 'Total Order Items', value: String(totalOrders) },
        { label: 'Avg Product Price', value: `$${(await db.product.aggregate({ _avg: { price: true } }))._avg.price?.toFixed(2) || '0.00'}` },
      ];
      break;
    }
  }

  // Draw summary cards
  const cardWidth = (pageWidth - 50) / 4;
  summaryData.forEach((item, i) => {
    const x = 20 + i * (cardWidth + 3.33);
    doc.setFillColor(LIGHT_GRAY);
    doc.roundedRect(x, y, cardWidth, 28, 3, 3, 'F');

    doc.setFillColor(GOLD);
    doc.rect(x, y, cardWidth, 2.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(MID_GRAY);
    doc.text(item.label, x + cardWidth / 2, y + 12, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(DARK);
    doc.text(item.value, x + cardWidth / 2, y + 22, { align: 'center' });
  });

  y += 45;

  // ===== CHART SECTION (Bar chart) =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(DARK);
  doc.text('Trend Overview', 20, y);
  y += 5;
  doc.setFillColor(GOLD);
  doc.rect(20, y, 30, 1.5, 'F');
  y += 12;

  // Get monthly data for chart
  const nowDate = new Date();
  const monthlyData: { month: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
    const mEnd = new Date(nowDate.getFullYear(), nowDate.getMonth() - i + 1, 0, 23, 59, 59);
    const monthLabel = mStart.toLocaleString('default', { month: 'short' });

    let value = 0;
    switch (type) {
      case 'sales':
      case 'revenue': {
        const invs = await db.invoice.findMany({ where: { status: 'paid', paidDate: { gte: mStart, lte: mEnd } } });
        value = invs.reduce((s, inv) => s + inv.total, 0);
        break;
      }
      case 'clients': {
        value = await db.client.count({ where: { createdAt: { gte: mStart, lte: mEnd } } });
        break;
      }
      case 'products': {
        value = await db.order.count({ where: { createdAt: { gte: mStart, lte: mEnd } } });
        break;
      }
    }
    monthlyData.push({ month: monthLabel, value });
  }

  const chartX = 20;
  const chartY = y;
  const chartWidth = pageWidth - 40;
  const chartHeight = 70;
  const maxVal = Math.max(...monthlyData.map(d => d.value), 1);
  const barWidth = (chartWidth - 60) / monthlyData.length - 10;

  // Chart background
  doc.setFillColor('#f1f5f9');
  doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 3, 3, 'F');

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const lineY = chartY + 10 + (chartHeight - 25) * (1 - i / 4);
    doc.setDrawColor('#e2e8f0');
    doc.setLineWidth(0.3);
    doc.line(chartX + 45, lineY, chartX + chartWidth - 10, lineY);
  }

  // Bars
  monthlyData.forEach((d, i) => {
    const barX = chartX + 50 + i * ((chartWidth - 60) / monthlyData.length);
    const barHeight = maxVal > 0 ? ((d.value / maxVal) * (chartHeight - 30)) : 0;

    // Bar gradient effect
    doc.setFillColor(DARK);
    doc.roundedRect(barX, chartY + chartHeight - 15 - barHeight, barWidth, barHeight, 2, 2, 'F');

    // Gold top cap
    doc.setFillColor(GOLD);
    doc.roundedRect(barX, chartY + chartHeight - 15 - barHeight, barWidth, 3, 2, 2, 'F');

    // Month label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(MID_GRAY);
    doc.text(d.month, barX + barWidth / 2, chartY + chartHeight - 5, { align: 'center' });

    // Value on top
    if (d.value > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(DARK);
      const label = type === 'clients' || type === 'products' ? String(d.value) : `$${d.value.toFixed(0)}`;
      doc.text(label, barX + barWidth / 2, chartY + chartHeight - 19 - barHeight, { align: 'center' });
    }
  });

  y = chartY + chartHeight + 15;

  // ===== DATA TABLE =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(DARK);
  doc.text('Detailed Data', 20, y);
  y += 5;
  doc.setFillColor(GOLD);
  doc.rect(20, y, 30, 1.5, 'F');
  y += 10;

  // Build table data based on type
  let tableHead: string[][] = [];
  let tableBody: (string | number)[][] = [];

  switch (type) {
    case 'sales': {
      const orders = await db.order.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: { client: true, orderItems: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      tableHead = [['Date', 'Client', 'Items', 'Total', 'Status']];
      tableBody = orders.map(o => [
        new Date(o.createdAt).toLocaleDateString(),
        o.client.name,
        o.orderItems.length.toString(),
        `$${o.total.toFixed(2)}`,
        o.status.charAt(0).toUpperCase() + o.status.slice(1),
      ]);
      break;
    }
    case 'clients': {
      const clients = await db.client.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: { _count: { select: { subscriptions: true, invoices: true, orders: true } } },
        orderBy: { createdAt: 'desc' },
      });
      tableHead = [['Name', 'Email', 'Company', 'Subscriptions', 'Status']];
      tableBody = clients.map(c => [
        c.name,
        c.email,
        c.company || '-',
        String(c._count.subscriptions),
        c.status,
      ]);
      break;
    }
    case 'revenue': {
      const invoices = await db.invoice.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: { client: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      tableHead = [['Invoice #', 'Client', 'Amount', 'Tax', 'Total', 'Status']];
      tableBody = invoices.map(inv => [
        inv.invoiceNumber,
        inv.client.name,
        `$${inv.amount.toFixed(2)}`,
        `$${inv.tax.toFixed(2)}`,
        `$${inv.total.toFixed(2)}`,
        inv.status,
      ]);
      break;
    }
    case 'products': {
      const products = await db.product.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: { _count: { select: { orderItems: true } } },
        orderBy: { createdAt: 'desc' },
      });
      tableHead = [['Product', 'Category', 'Price', 'Stock', 'Times Ordered']];
      tableBody = products.map(p => [
        p.name,
        p.category || '-',
        `$${p.price.toFixed(2)}`,
        String(p.stock),
        String(p._count.orderItems),
      ]);
      break;
    }
  }

  if (tableBody.length > 0) {
    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: DARK,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        textColor: DARK_GRAY,
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: LIGHT_GRAY,
      },
      margin: { left: 20, right: 20 },
    });
  }

  // ===== FOOTER =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(DARK);
    doc.rect(0, ph - 20, pageWidth, 20, 'F');

    doc.setFillColor(GOLD);
    doc.rect(0, ph - 23, pageWidth, 3, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text('BrandFlow - Premium Brand Management', pageWidth / 2, ph - 8, { align: 'center' });
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, ph - 3, { align: 'center' });
  }

  return doc.output('arraybuffer') as Uint8Array;
}
