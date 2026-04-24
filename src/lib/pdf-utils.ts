import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DARK = '#1a1a2e';
const GOLD = '#d4af37';
const WHITE = '#ffffff';
const LIGHT_GRAY = '#f8f9fa';
const MID_GRAY = '#6b7280';
const DARK_GRAY = '#374151';

interface InvoiceData {
  invoiceNumber: string;
  amount: number;
  tax: number;
  total: number;
  status: string;
  dueDate: string;
  paidDate: string | null;
  notes: string | null;
  createdAt: string;
  client: {
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    address: string | null;
  };
  subscription: {
    plan: { name: string; price: number } | null;
    startDate: string;
    endDate: string;
  } | null;
}

export async function generateInvoicePDF(invoice: InvoiceData): Promise<Uint8Array> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header background
  doc.setFillColor(DARK);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Gold accent line
  doc.setFillColor(GOLD);
  doc.rect(0, 50, pageWidth, 3, 'F');

  // BrandFlow text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(WHITE);
  doc.text('BrandFlow', 20, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text('Premium Brand Management Platform', 20, 40);

  // Invoice label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(GOLD);
  doc.text('INVOICE', pageWidth - 20, 25, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(WHITE);
  doc.text(`#${invoice.invoiceNumber}`, pageWidth - 20, 35, { align: 'right' });

  // Status badge
  const statusColors: Record<string, string> = {
    paid: '#22c55e',
    pending: '#eab308',
    overdue: '#ef4444',
  };
  doc.setFillColor(statusColors[invoice.status] || '#6b7280');
  const statusX = pageWidth - 60;
  doc.roundedRect(statusX, 38, 40, 8, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.status.toUpperCase(), statusX + 20, 43.5, { align: 'center' });

  // Client info section
  let y = 70;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(DARK);
  doc.text('Bill To:', 20, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(DARK_GRAY);
  y += 8;
  doc.text(invoice.client.company || invoice.client.name, 20, y);
  y += 6;
  doc.text(invoice.client.name, 20, y);
  y += 6;
  doc.text(invoice.client.email, 20, y);
  if (invoice.client.phone) { y += 6; doc.text(invoice.client.phone, 20, y); }
  if (invoice.client.address) { y += 6; doc.text(invoice.client.address, 20, y); }

  // Date info on right
  y = 70;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(MID_GRAY);
  const rightX = pageWidth - 20;

  doc.text('Date Issued:', rightX, y, { align: 'right' });
  doc.text('Due Date:', rightX, y + 8, { align: 'right' });
  if (invoice.paidDate) doc.text('Paid Date:', rightX, y + 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK);
  doc.text(new Date(invoice.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), rightX, y + 4, { align: 'right' });
  doc.text(new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), rightX, y + 12, { align: 'right' });
  if (invoice.paidDate) doc.text(new Date(invoice.paidDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), rightX, y + 20, { align: 'right' });

  // Subscription details if exists
  if (invoice.subscription?.plan) {
    y = Math.max(y + 30, 110);
    doc.setFillColor(LIGHT_GRAY);
    doc.roundedRect(20, y - 5, pageWidth - 40, 20, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(DARK);
    doc.text(`Subscription: ${invoice.subscription.plan.name}`, 30, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(MID_GRAY);
    const periodStart = new Date(invoice.subscription.startDate).toLocaleDateString();
    const periodEnd = new Date(invoice.subscription.endDate).toLocaleDateString();
    doc.text(`Period: ${periodStart} — ${periodEnd}`, pageWidth - 30, y + 5, { align: 'right' });
    y += 25;
  }

  // Table
  y = Math.max(y, 130);

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Qty', 'Rate', 'Amount']],
    body: [
      [
        `${invoice.subscription?.plan?.name || 'Service'} - Monthly Subscription`,
        '1',
        `$${invoice.amount.toFixed(2)}`,
        `$${invoice.amount.toFixed(2)}`,
      ],
    ],
    foot: [
      ['Subtotal', '', '', `$${invoice.amount.toFixed(2)}`],
      ['Tax (8%)', '', '', `$${invoice.tax.toFixed(2)}`],
      [
        { content: 'Total', styles: { fontStyle: 'bold', fontSize: 11 } },
        '',
        '',
        { content: `$${invoice.total.toFixed(2)}`, styles: { fontStyle: 'bold', fontSize: 11 } },
      ],
    ],
    theme: 'plain',
    headStyles: {
      fillColor: DARK,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      textColor: DARK_GRAY,
      fontSize: 10,
    },
    footStyles: {
      textColor: DARK,
      fontSize: 10,
    },
    columnStyles: {
      0: { cellPadding: { left: 10 } },
      3: { halign: 'right', cellPadding: { right: 10 } },
    },
    margin: { left: 20, right: 20 },
  });

  // Notes
  if (invoice.notes) {
    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y + 80;
    const notesY = finalY + 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(MID_GRAY);
    doc.text('Notes', 20, notesY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(DARK_GRAY);
    doc.text(invoice.notes, 20, notesY + 6);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(DARK);
  doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');

  doc.setFillColor(GOLD);
  doc.rect(0, pageHeight - 28, pageWidth, 3, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text('BrandFlow - Premium Brand Management', pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 5, { align: 'center' });

  return doc.output('arraybuffer') as Uint8Array;
}
