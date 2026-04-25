// ============================================================================
// PDF Generator — Valtriox ULTRA PREMIUM Invoice & Report PDFs
// Uses pdfkit with EMBEDDED TTF fonts (base64 in font-buffers.ts)
// Serverless-safe — no filesystem dependency for fonts
// BLACK Background + GOLD Everything — Luxury Shine Theme
// ============================================================================

import PDFDocument from "pdfkit";
import { FONT_REGULAR, FONT_BOLD, FONT_ITALIC, FONT_BOLD_ITALIC } from "./font-buffers";

// ── Font Registration ──
// CRITICAL FIX: NO caching flag! On Vercel serverless, if first request fails
// font registration, a cached flag would make ALL subsequent PDFs blank.
// pdfkit handles re-registration gracefully, so we register on EVERY request.

const FONT = {
  regular: "LiberationSans",
  bold: "LiberationSans-Bold",
  italic: "LiberationSans-Italic",
  boldItalic: "LiberationSans-BoldItalic",
};

function ensureFontsRegistered(doc: any): void {
  doc.registerFont(FONT.regular, FONT_REGULAR);
  doc.registerFont(FONT.bold, FONT_BOLD);
  doc.registerFont(FONT.italic, FONT_ITALIC);
  doc.registerFont(FONT.boldItalic, FONT_BOLD_ITALIC);
}

// ── Types ──

export interface InvoiceData {
  invoiceNumber: string;
  status: "pending" | "paid" | "approved" | "cancelled" | "refunded";
  planName: string;
  amount: number;
  billingCycle: string;
  currencySymbol: string;
  currencyCode: string;
  issuedAt: Date;
  dueDate?: Date | null;
  paidAt?: Date | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  notes?: string | null;
  paymentMethod?: string;
  transactionId?: string;
  orgName: string;
  orgEmail?: string;
  orgPhone?: string;
  orgAddress?: string;
  orgCountry?: string;
  orgTaxId?: string;
  platformName?: string;
  platformEmail?: string;
  platformPhone?: string;
  platformAddress?: string;
  platformWebsite?: string;
  platformWhatsapp?: string;
  platformInstagram?: string;
  platformFacebook?: string;
  platformTwitter?: string;
  platformSupportHours?: string;
  platformInvoiceHeaderText?: string;
  platformPaymentMethods?: string[];
  platformLogo?: string;
  platformTagline?: string;
  planFeatures?: string[];
  planTeamLimit?: number;
  planOrderLimit?: number;
  planProductLimit?: number;
  planTrialDays?: number;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  period: string;
  generatedAt: string;
  orgName: string;
  orgEmail?: string;
  orgPhone?: string;
  brandName?: string;
  brandColor?: string;
  plan?: string;
  stats: Array<{ label: string; value: string | number }>;
  tables?: Array<{
    title: string;
    headers: string[];
    rows: Array<Array<string | number>>;
  }>;
  summary?: string;
  platformName?: string;
  platformEmail?: string;
  platformPhone?: string;
  platformWebsite?: string;
  platformWhatsapp?: string;
  platformInstagram?: string;
  platformFacebook?: string;
  platformTwitter?: string;
  platformSupportHours?: string;
  platformLogo?: string;
  platformTagline?: string;

  // NEW: Chart data
  barChartData?: Array<{ label: string; value: number; maxValue?: number }>;
  trendChartData?: Array<{ label: string; value: number }>;
  pieChartData?: Array<{ label: string; value: number; color: string }>;

  // NEW: Comparative period
  comparison?: {
    previousPeriodLabel: string;
    stats: Array<{ label: string; currentValue: number; previousValue: number; change: number }>;
  };

  // NEW: Brand branding (cover page logo, distinct from platform logo in header)
  brandLogo?: string; // Base64 data URI

  // NEW: Page numbering (computed at render time)
  totalPages?: number;
}

// ── Color Constants — BLACK + GOLD Shine Theme ──

const C = {
  bg: "#0a0a0f",
  bg2: "#111118",
  bg3: "#16161f",
  goldBright: "#fbbf24",
  gold: "#f59e0b",
  goldMid: "#d97706",
  goldDim: "#b45309",
  goldFaint: "#92400e",
  goldUltraFaint: "#78350f",
  goldBg: "rgba(217,119,6,0.04)",
  goldBg2: "rgba(217,119,6,0.08)",
  goldBg3: "rgba(217,119,6,0.12)",
  goldBorder: "rgba(217,119,6,0.15)",
  goldBorder2: "rgba(217,119,6,0.25)",
  goldLine: "rgba(217,119,6,0.3)",
  green: "#34d399",
  yellow: "#fbbf24",
  red: "#f87171",
};

// ── Helpers ──

function safeDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(date: Date | string | null | undefined): string {
  const d = safeDate(date);
  if (!d) return "N/A";
  return d.toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" });
}

function formatCurrency(amount: number, symbol: string): string {
  return `${symbol} ${amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function generateInvoiceNumber(existingCount: number): string {
  const year = new Date().getFullYear();
  const seq = String(existingCount + 1).padStart(4, "0");
  return `VTX-${year}-${seq}`;
}

function goldLine(doc: any, x1: number, y1: number, x2: number, y2: number, width: number = 0.5) {
  doc.save().moveTo(x1, y1).lineTo(x2, y2).lineWidth(width).strokeColor(C.goldLine).stroke().restore();
}

function drawCard(doc: any, x: number, y: number, w: number, h: number, radius: number = 8) {
  doc.save();
  doc.roundedRect(x, y, w, h, radius).fill(C.goldBg);
  doc.roundedRect(x, y, w, h, radius).lineWidth(0.5).strokeColor(C.goldBorder).stroke();
  doc.restore();
}

function drawCardBright(doc: any, x: number, y: number, w: number, h: number, radius: number = 8) {
  doc.save();
  doc.roundedRect(x, y, w, h, radius).fill(C.goldBg2);
  doc.roundedRect(x, y, w, h, radius).lineWidth(0.8).strokeColor(C.goldBorder2).stroke();
  doc.restore();
}

function parseBase64DataUri(dataUri: string): { mimeType: string; base64: string } | null {
  if (!dataUri) return null;
  const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

// Helper: render default VTX logo and return right X position
function renderDefaultLogo(doc: any, x: number, y: number): number {
  doc.save();
  doc.roundedRect(x, y, 38, 38, 6).fill(C.gold);
  doc.fontSize(15).fillColor(C.bg);
  doc.font(FONT.bold).text("VTX", x + 5, y + 11, { width: 28, align: "center" });
  doc.restore();
  return x + 48;
}

// ── NEW: Empty Data Check ──

function isEmptyData(stats: Array<{ label: string; value: string | number }>): boolean {
  if (!stats || stats.length === 0) return true;
  return stats.every((s) => {
    const v = typeof s.value === "number" ? s.value : parseFloat(String(s.value).replace(/[^0-9.\-]/g, ""));
    return v === 0 || isNaN(v);
  });
}

// ── NEW: Chart Drawing Helpers ──

/**
 * Draws a ▲/▼ trend indicator with percentage change.
 * Green for positive, red for negative.
 * Returns the approximate width consumed (for layout chaining).
 */
function drawTrendIndicator(doc: any, x: number, y: number, change: number, font?: string): number {
  const isPositive = change >= 0;
  const arrow = isPositive ? "▲" : "▼";
  const color = isPositive ? C.green : C.red;
  const absChange = Math.abs(change);
  const text = `${arrow} ${absChange.toFixed(1)}%`;

  doc.save();
  doc.font(font || FONT.bold).fontSize(8).fillColor(color);
  const tw = doc.widthOfString(text);
  doc.text(text, x, y);
  doc.restore();

  return tw;
}

/**
 * Draws a vertical bar chart for revenue / trend data.
 * Bars rendered with gold gradient fill on dark card background.
 * Includes horizontal grid lines, Y-axis labels, X-axis labels, and value labels above bars.
 */
function drawVerticalBarChart(
  doc: any,
  x: number,
  y: number,
  w: number,
  h: number,
  data: Array<{ label: string; value: number }>,
  currency: string,
  font?: string
): void {
  if (!data || data.length === 0) return;

  const fn = font || FONT.regular;
  const maxItems = 14;
  const chartData = data.length > maxItems ? data.slice(0, maxItems) : data;

  // Card background
  doc.save();
  doc.roundedRect(x, y, w, h, 8).fill(C.goldBg);
  doc.roundedRect(x, y, w, h, 8).lineWidth(0.5).strokeColor(C.goldBorder).stroke();
  doc.restore();

  // Chart area within card (with padding)
  const padLeft = 58;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 36;
  const chartX = x + padLeft;
  const chartY = y + padTop;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const maxVal = Math.max(...chartData.map((d) => d.value), 1);
  // Round up to a nice number for grid
  const niceMax = Math.ceil(maxVal / 10) * 10 || 10;
  const gridCount = 4;

  // Draw horizontal grid lines and Y-axis labels
  for (let i = 0; i <= gridCount; i++) {
    const gy = chartY + chartH - (i / gridCount) * chartH;
    const val = (i / gridCount) * niceMax;

    // Grid line (subtle dashed appearance via thin stroke)
    doc.save();
    doc.moveTo(chartX, gy).lineTo(chartX + chartW, gy).lineWidth(0.3).strokeColor(C.goldLine).stroke();
    doc.restore();

    // Y-axis label
    doc.save();
    doc.font(fn).fontSize(6.5).fillColor(C.goldDim);
    let label: string;
    if (niceMax >= 1000000) {
      label = `${(val / 1000000).toFixed(1)}M`;
    } else if (niceMax >= 1000) {
      label = `${(val / 1000).toFixed(0)}K`;
    } else {
      label = String(Math.round(val));
    }
    doc.text(label, x + 4, gy - 4, { width: padLeft - 8, align: "right" });
    doc.restore();
  }

  // Bars
  const barGap = 4;
  const totalGaps = (chartData.length + 1) * barGap;
  const barWidth = Math.max(Math.min((chartW - totalGaps) / chartData.length, 36), 6);

  // Center bars if they're narrower than available space
  const totalBarsWidth = chartData.length * barWidth + (chartData.length + 1) * barGap;
  const offsetX = chartX + (chartW - totalBarsWidth) / 2;

  chartData.forEach((item, i) => {
    const bx = offsetX + barGap + i * (barWidth + barGap);
    const barH = Math.max((item.value / niceMax) * chartH, 1);
    const by = chartY + chartH - barH;

    // Bar gradient fill
    doc.save();
    const grad = doc.linearGradient(bx, by, bx, chartY + chartH);
    grad.stop(0, C.goldBright);
    grad.stop(0.6, C.gold);
    grad.stop(1, C.goldMid);
    doc.rect(bx, by, barWidth, barH).fill(grad);
    doc.restore();

    // Subtle bar border
    doc.save();
    doc.rect(bx, by, barWidth, barH).lineWidth(0.3).strokeColor(C.goldBorder2).stroke();
    doc.restore();

    // Value label above bar
    doc.save();
    doc.font(fn).fontSize(6).fillColor(C.goldBright);
    let valLabel: string;
    if (currency) {
      if (item.value >= 1000000) {
        valLabel = `${currency}${(item.value / 1000000).toFixed(1)}M`;
      } else if (item.value >= 1000) {
        valLabel = `${currency}${(item.value / 1000).toFixed(0)}K`;
      } else {
        valLabel = `${currency}${Math.round(item.value)}`;
      }
    } else {
      valLabel = String(Math.round(item.value));
    }
    doc.text(valLabel, bx - 2, by - 12, { width: barWidth + 4, align: "center" });
    doc.restore();

    // X-axis label (below bar)
    doc.save();
    doc.font(fn).fontSize(6).fillColor(C.goldDim);
    // Truncate long labels
    let lbl = item.label;
    if (lbl.length > 8) lbl = lbl.substring(0, 7) + "…";
    doc.text(lbl, bx - 2, chartY + chartH + 6, { width: barWidth + 4, align: "center" });
    doc.restore();
  });

  // Baseline axis
  doc.save();
  doc.moveTo(chartX, chartY + chartH).lineTo(chartX + chartW, chartY + chartH).lineWidth(0.6).strokeColor(C.goldMid).stroke();
  doc.restore();
}

/**
 * Draws a horizontal bar chart for top items (products, customers, etc.).
 * Labels on the left, gold bars extending right, values at the end.
 */
function drawHorizontalBarChart(
  doc: any,
  x: number,
  y: number,
  w: number,
  h: number,
  data: Array<{ label: string; value: number; maxValue?: number }>,
  currency: string,
  font?: string
): void {
  if (!data || data.length === 0) return;

  const fn = font || FONT.regular;
  const maxItems = 10;
  const chartData = data.length > maxItems ? data.slice(0, maxItems) : data;

  // Card background
  doc.save();
  doc.roundedRect(x, y, w, h, 8).fill(C.goldBg);
  doc.roundedRect(x, y, w, h, 8).lineWidth(0.5).strokeColor(C.goldBorder).stroke();
  doc.restore();

  const padLeft = 110;
  const padRight = 70;
  const padTop = 14;
  const padBottom = 14;
  const barAreaX = x + padLeft;
  const barAreaW = w - padLeft - padRight;
  const barAreaY = y + padTop;
  const barAreaH = h - padTop - padBottom;

  const maxVal = data[0]?.maxValue || Math.max(...chartData.map((d) => d.value), 1);
  const niceMax = Math.ceil(maxVal / 10) * 10 || 10;

  const barGap = 6;
  const barH = Math.max(Math.min((barAreaH - (chartData.length + 1) * barGap) / chartData.length, 18), 8);
  const totalBarsH = chartData.length * barH + (chartData.length + 1) * barGap;
  const offsetY = barAreaY + (barAreaH - totalBarsH) / 2;

  chartData.forEach((item, i) => {
    const by = offsetY + barGap + i * (barH + barGap);
    const barW = Math.max((item.value / niceMax) * barAreaW, 2);

    // Label on the left
    doc.save();
    doc.font(fn).fontSize(7.5).fillColor(C.gold);
    let lbl = item.label;
    if (lbl.length > 14) lbl = lbl.substring(0, 13) + "…";
    doc.text(lbl, x + 10, by + barH / 2 - 4, { width: padLeft - 20, align: "right" });
    doc.restore();

    // Bar with gradient
    doc.save();
    const grad = doc.linearGradient(barAreaX, by, barAreaX + barW, by);
    grad.stop(0, C.goldMid);
    grad.stop(0.5, C.gold);
    grad.stop(1, C.goldBright);
    doc.roundedRect(barAreaX, by, barW, barH, 3).fill(grad);
    doc.restore();

    // Subtle bar border
    doc.save();
    doc.roundedRect(barAreaX, by, barW, barH, 3).lineWidth(0.3).strokeColor(C.goldBorder2).stroke();
    doc.restore();

    // Value at the end of bar
    doc.save();
    doc.font(fn).fontSize(7).fillColor(C.goldBright);
    let valText: string;
    if (currency) {
      if (item.value >= 1000000) {
        valText = `${currency}${(item.value / 1000000).toFixed(1)}M`;
      } else if (item.value >= 1000) {
        valText = `${currency}${(item.value / 1000).toFixed(0)}K`;
      } else {
        valText = `${currency}${Math.round(item.value)}`;
      }
    } else {
      valText = String(Math.round(item.value));
    }
    doc.text(valText, barAreaX + barW + 6, by + barH / 2 - 4, { width: padRight - 10 });
    doc.restore();
  });
}

/**
 * Draws a donut chart (ring chart) for distribution data.
 * Returns the total height consumed (chart + legend) so the caller can position the next element.
 */
function drawDonutChart(
  doc: any,
  cx: number,
  cy: number,
  radius: number,
  data: Array<{ label: string; value: number; color: string }>,
  font?: string
): number {
  if (!data || data.length === 0) return 0;

  const fn = font || FONT.regular;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return 0;

  const outerR = radius;
  const innerR = radius * 0.55;
  const maxSlices = 8;

  // Combine small slices into "Other" if too many
  let chartData = [...data];
  if (chartData.length > maxSlices) {
    const top = chartData.slice(0, maxSlices - 1);
    const rest = chartData.slice(maxSlices - 1);
    const otherVal = rest.reduce((s, d) => s + d.value, 0);
    top.push({ label: "Other", value: otherVal, color: C.goldDim });
    chartData = top;
  }

  let currentAngle = -Math.PI / 2; // Start from top

  chartData.forEach((item) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const endAngle = currentAngle + sliceAngle;
    const cos = Math.cos;
    const sin = Math.sin;

    // Outer arc start and end points
    const ox1 = cx + outerR * cos(currentAngle);
    const oy1 = cy + outerR * sin(currentAngle);
    const ox2 = cx + outerR * cos(endAngle);
    const oy2 = cy + outerR * sin(endAngle);
    // Inner arc points (reversed)
    const ix1 = cx + innerR * cos(endAngle);
    const iy1 = cy + innerR * sin(endAngle);
    const ix2 = cx + innerR * cos(currentAngle);
    const iy2 = cy + innerR * sin(currentAngle);

    doc.save();
    doc.moveTo(ox1, oy1);
    doc.arc(cx, cy, outerR, currentAngle, endAngle, false);
    doc.lineTo(ix1, iy1);
    doc.arc(cx, cy, innerR, endAngle, currentAngle, true);
    doc.closePath();
    doc.fill(item.color);
    // Subtle border
    doc.lineWidth(0.5).strokeColor(C.bg).stroke();
    doc.restore();

    // Label on the slice (if slice is big enough)
    const pct = (item.value / total) * 100;
    if (pct > 5) {
      const midAngle = currentAngle + sliceAngle / 2;
      const labelR = (outerR + innerR) / 2;
      const lx = cx + labelR * cos(midAngle);
      const ly = cy + labelR * sin(midAngle);

      doc.save();
      doc.font(FONT.bold).fontSize(6).fillColor(C.bg);
      doc.text(`${pct.toFixed(0)}%`, lx - 10, ly - 4, { width: 20, align: "center" });
      doc.restore();
    }

    currentAngle = endAngle;
  });

  // Center circle background (to clean up any artifacts)
  doc.save();
  doc.circle(cx, cy, innerR - 0.5).fill(C.bg);
  doc.restore();

  // Center total value
  doc.save();
  doc.font(FONT.bold).fontSize(14).fillColor(C.goldBright);
  doc.text(String(Math.round(total)), cx - 30, cy - 12, { width: 60, align: "center" });
  doc.font(FONT.regular).fontSize(6.5).fillColor(C.goldDim);
  doc.text("TOTAL", cx - 20, cy + 6, { width: 40, align: "center" });
  doc.restore();

  // Legend below the donut
  const legendY = cy + outerR + 18;
  const legendCols = Math.min(chartData.length, 4);
  const colW = (radius * 2) / legendCols;
  const legendH = Math.ceil(chartData.length / legendCols) * 16;

  chartData.forEach((item, i) => {
    const col = i % legendCols;
    const row = Math.floor(i / legendCols);
    const lx = cx - radius + col * colW;
    const ly = legendY + row * 16;

    // Color dot
    doc.save();
    doc.circle(lx + 4, ly + 4, 3).fill(item.color);
    doc.restore();

    // Label
    doc.save();
    doc.font(fn).fontSize(6.5).fillColor(C.gold);
    let lbl = item.label;
    if (lbl.length > 16) lbl = lbl.substring(0, 15) + "…";
    const pctTxt = ` ${lbl} (${((item.value / total) * 100).toFixed(1)}%)`;
    doc.text(pctTxt, lx + 10, ly, { width: colW - 12 });
    doc.restore();
  });

  return radius * 2 + legendH + 30;
}

/**
 * Helper: ensure there's enough space on the current page for `needed` height.
 * If not, add a new page with standard background, and update y to the new top.
 * Returns the updated Y position.
 */
function ensureSpace(doc: any, y: number, needed: number, W: number, H: number, P: number): number {
  if (y + needed > H - 80) {
    doc.addPage();
    doc.rect(0, 0, W, H).fill(C.bg);
    doc.rect(0, 0, W, 3).fill(C.gold);
    return P + 10;
  }
  return y;
}

// ============================================================================
// Generate ULTRA PREMIUM Invoice PDF — BLACK + GOLD Shine
// ============================================================================

export async function generateInvoicePDF(invoice: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let hasErrored = false;
    const buffers: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      bufferPages: true,
      autoFirstPage: true,
    });

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => { if (!hasErrored) resolve(Buffer.concat(buffers)); });
    doc.on("error", (err) => { hasErrored = true; reject(err); });

    const issuedAt = safeDate(invoice.issuedAt) || new Date();
    const dueDate = safeDate(invoice.dueDate);
    const paidAt = safeDate(invoice.paidAt);
    const periodStart = safeDate(invoice.periodStart);
    const periodEnd = safeDate(invoice.periodEnd);

    const W = 595.28;
    const H = 841.89;
    const P = 44;
    const CW = W - P * 2;

    const platformName = invoice.platformName || "Valtriox";
    const cycleLabel = invoice.billingCycle === "annually" ? "Annual" : "Monthly";
    const hasLogo = !!invoice.platformLogo;

    try {
      // ── REGISTER FONTS FIRST — throws immediately if failed ──
      ensureFontsRegistered(doc);

      // ── FULL PAGE BLACK BACKGROUND ──
      doc.rect(0, 0, W, H).fill(C.bg);

      // Subtle gradient header area
      doc.save();
      const hdrGrad = doc.linearGradient(0, 0, W, 150);
      hdrGrad.stop(0, C.bg3, 0.5);
      hdrGrad.stop(1, C.bg, 1);
      doc.rect(0, 0, W, 150).fill(hdrGrad);
      doc.restore();

      // ── TOP GOLD ACCENT BAR ──
      doc.rect(0, 0, W, 3).fill(C.gold);

      // ── PREMIUM BADGE ──
      doc.save();
      doc.roundedRect(W - 82, 10, 68, 20, 4).fill(C.goldBg3);
      doc.roundedRect(W - 82, 10, 68, 20, 4).lineWidth(0.5).strokeColor(C.goldBorder2).stroke();
      doc.fontSize(7).fillColor(C.gold);
      doc.font(FONT.bold).text("PREMIUM", W - 80, 16, { width: 64, align: "center" });
      doc.restore();

      // ── HEADER SECTION ──
      let y = 18;
      let headerRightStartX = P + 200;

      // LEFT: Logo + Company Name
      if (hasLogo) {
        const logoParsed = parseBase64DataUri(invoice.platformLogo!);
        if (logoParsed) {
          try {
            const logoBuffer = Buffer.from(logoParsed.base64, "base64");
            doc.save();
            doc.roundedRect(P, y, 44, 44, 8).fill(C.goldBg2);
            doc.roundedRect(P, y, 44, 44, 8).lineWidth(0.5).strokeColor(C.goldBorder2).stroke();
            doc.image(logoBuffer, P + 4, y + 4, { width: 36, height: 36 });
            doc.restore();
            headerRightStartX = P + 56;
          } catch (imgErr) {
            headerRightStartX = renderDefaultLogo(doc, P, y);
          }
        } else {
          headerRightStartX = renderDefaultLogo(doc, P, y);
        }
      } else {
        headerRightStartX = renderDefaultLogo(doc, P, y);
      }

      // Company Name — bright gold
      doc.font(FONT.bold).fontSize(20).fillColor(C.goldBright);
      doc.text(platformName, headerRightStartX, y + 2);

      // Slogan — from DB or default
      doc.font(FONT.italic).fontSize(8).fillColor(C.goldMid);
      doc.text(invoice.platformTagline || "The Universal Brand Management Portal", headerRightStartX, y + 24);

      // Platform contact info (right side of header)
      const rx = W - P;
      doc.font(FONT.regular).fontSize(7).fillColor(C.goldMid);

      const contactParts: string[] = [];
      if (invoice.platformEmail) contactParts.push(invoice.platformEmail);
      if (invoice.platformPhone) contactParts.push(invoice.platformPhone);
      if (invoice.platformWebsite) contactParts.push(invoice.platformWebsite);
      if (contactParts.length > 0) {
        doc.text(contactParts.join("  |  "), headerRightStartX, y + 2, { width: rx - headerRightStartX, align: "right" });
      }
      if (invoice.platformAddress) {
        doc.text(invoice.platformAddress, headerRightStartX, y + 13, { width: rx - headerRightStartX, align: "right" });
      }

      // INVOICE title — BRIGHT GOLD, right side
      doc.font(FONT.bold).fontSize(32).fillColor(C.goldBright);
      doc.text("INVOICE", rx - 160, y + 26, { width: 160, align: "right" });

      y += 58;

      // ── INVOICE HEADER TEXT (gold banner) ──
      if (invoice.platformInvoiceHeaderText) {
        doc.save();
        doc.roundedRect(P, y, CW, 22, 4).fill(C.goldBg2);
        doc.roundedRect(P, y, CW, 22, 4).lineWidth(0.3).strokeColor(C.goldBorder).stroke();
        doc.font(FONT.italic).fontSize(8).fillColor(C.gold);
        doc.text(invoice.platformInvoiceHeaderText, P + 12, y + 7, { width: CW - 24, align: "center" });
        doc.restore();
        y += 28;
      }

      // ── GOLD DIVIDER ──
      goldLine(doc, P, y, W - P, y, 0.8);
      y += 12;

      // ── STATUS BADGE ──
      const statusMap: Record<string, { color: string; bg: string; label: string }> = {
        pending: { color: C.yellow, bg: "rgba(251,191,36,0.08)", label: "PENDING" },
        paid: { color: C.green, bg: "rgba(52,211,153,0.08)", label: "PAID" },
        approved: { color: C.green, bg: "rgba(52,211,153,0.08)", label: "APPROVED" },
        cancelled: { color: "#94a3b8", bg: "rgba(148,163,184,0.06)", label: "CANCELLED" },
        refunded: { color: C.red, bg: "rgba(248,113,113,0.08)", label: "REFUNDED" },
      };
      const st = statusMap[invoice.status] || statusMap.pending;

      doc.save();
      doc.roundedRect(rx - 110, y, 110, 18, 4).fill(st.bg);
      doc.rect(rx - 110, y, 3, 18).fill(st.color);
      doc.font(FONT.bold).fontSize(8).fillColor(st.color);
      doc.text(st.label, rx - 102, y + 5, { width: 96, align: "center" });
      doc.restore();

      // ── BILLED TO (left) + INVOICE DETAILS (right) ──
      const leftColW = CW * 0.5;
      const rightColX = P + leftColW + 20;
      const billedToStartY = y + 26;

      doc.font(FONT.bold).fontSize(7).fillColor(C.goldMid);
      doc.text("BILLED TO", P, billedToStartY);

      doc.font(FONT.bold).fontSize(13).fillColor(C.goldBright);
      doc.text(invoice.orgName, P, billedToStartY + 12);

      doc.font(FONT.regular).fontSize(8.5).fillColor(C.goldMid);
      let detailY = billedToStartY + 28;
      if (invoice.orgEmail) { doc.text(invoice.orgEmail, P, detailY); detailY += 12; }
      if (invoice.orgPhone) { doc.text(invoice.orgPhone, P, detailY); detailY += 12; }
      if (invoice.orgAddress) { doc.text(invoice.orgAddress, P, detailY, { width: leftColW - 10 }); detailY += 12; }
      if (invoice.orgCountry) { doc.text(invoice.orgCountry, P, detailY); detailY += 12; }
      if (invoice.orgTaxId) {
        doc.font(FONT.regular).fontSize(7.5).fillColor(C.goldDim);
        doc.text(`Tax ID: ${invoice.orgTaxId}`, P, detailY);
        detailY += 12;
      }

      const leftEndY = detailY;

      doc.font(FONT.bold).fontSize(7).fillColor(C.goldMid);
      doc.text("INVOICE DETAILS", rightColX, billedToStartY);

      const details: [string, string][] = [
        ["Invoice #", invoice.invoiceNumber],
        ["Issue Date", formatDate(issuedAt)],
        ["Due Date", formatDate(dueDate || issuedAt)],
      ];
      if (paidAt) details.push(["Paid On", formatDate(paidAt)]);
      if (periodStart && periodEnd) {
        details.push(["Period", `${formatDate(periodStart)} - ${formatDate(periodEnd)}`]);
      }

      let dY = billedToStartY + 12;
      for (const [label, value] of details) {
        doc.font(FONT.bold).fontSize(7.5).fillColor(C.goldMid);
        doc.text(label, rightColX, dY);
        doc.font(FONT.regular).fontSize(8).fillColor(C.goldBright);
        doc.text(value, rightColX + 68, dY, { width: CW - leftColW - 88 });
        dY += 13;
      }

      y = Math.max(leftEndY, dY) + 8;
      goldLine(doc, P, y, W - P, y, 0.6);
      y += 10;

      // ── PLAN DETAILS CARD ──
      const planCardH = 185;
      drawCardBright(doc, P, y, CW, planCardH);

      doc.font(FONT.bold).fontSize(14).fillColor(C.goldBright);
      doc.text(`${invoice.planName.charAt(0).toUpperCase() + invoice.planName.slice(1)} Plan`, P + 16, y + 14);

      doc.save();
      doc.roundedRect(P + 180, y + 12, 55, 18, 4).fill(C.goldBg3);
      doc.roundedRect(P + 180, y + 12, 55, 18, 4).lineWidth(0.3).strokeColor(C.goldBorder2).stroke();
      doc.font(FONT.bold).fontSize(7.5).fillColor(C.gold);
      doc.text(cycleLabel, P + 180, y + 17, { width: 55, align: "center" });
      doc.restore();

      let badgeX = P + 245;
      const fmtLimit = (v: number | undefined) => {
        if (!v) return null;
        if (v < 0) return "Unlimited";
        return String(v);
      };
      const limits = [
        fmtLimit(invoice.planTeamLimit) ? `${fmtLimit(invoice.planTeamLimit)} Team` : null,
        fmtLimit(invoice.planOrderLimit) ? `${fmtLimit(invoice.planOrderLimit)} Orders` : null,
        fmtLimit(invoice.planProductLimit) ? `${fmtLimit(invoice.planProductLimit)} Products` : null,
      ].filter(Boolean);
      for (const lim of limits) {
        const bw = String(lim).length > 8 ? 72 : 62;
        doc.save();
        doc.roundedRect(badgeX, y + 12, bw, 18, 4).fill(C.goldBg);
        doc.roundedRect(badgeX, y + 12, bw, 18, 4).lineWidth(0.3).strokeColor(C.goldBorder).stroke();
        doc.font(FONT.regular).fontSize(7).fillColor(C.goldMid);
        doc.text(String(lim), badgeX, y + 17, { width: bw, align: "center" });
        doc.restore();
        badgeX += bw + 5;
      }

      if (invoice.planFeatures && invoice.planFeatures.length > 0) {
        const featStartY = y + 36;
        doc.font(FONT.bold).fontSize(7).fillColor(C.goldMid);
        doc.text("PLAN FEATURES", P + 16, featStartY);
        const colW = (CW - 32) / 2;
        const perCol = Math.ceil(invoice.planFeatures.length / 2);
        for (let ci = 0; ci < 2; ci++) {
          let fy = featStartY + 13;
          const start = ci * perCol;
          const end = Math.min(start + perCol, invoice.planFeatures.length);
          for (let fi = start; fi < end; fi++) {
            const feature = invoice.planFeatures[fi];
            const fx = P + 16 + ci * colW;
            doc.circle(fx + 3, fy + 3.5, 1.5).fill(C.gold);
            doc.font(FONT.regular).fontSize(8).fillColor(C.goldMid);
            doc.text(feature, fx + 10, fy, { width: colW - 14 });
            fy += 13;
          }
        }
      }

      const payY = y + planCardH - 48;
      doc.save();
      doc.moveTo(P + 16, payY).lineTo(W - P - 16, payY).lineWidth(0.4).strokeColor(C.goldLine).stroke();
      doc.restore();

      const payLabelX = P + 16;
      const payValueX = P + 130;

      if (invoice.paymentMethod) {
        const pmLabel = invoice.paymentMethod.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        doc.font(FONT.bold).fontSize(7.5).fillColor(C.goldMid);
        doc.text("Payment Method", payLabelX, payY + 8);
        doc.font(FONT.regular).fontSize(8).fillColor(C.gold);
        doc.text(pmLabel, payValueX, payY + 8);
      }

      if (invoice.transactionId) {
        doc.font(FONT.bold).fontSize(7.5).fillColor(C.goldDim);
        doc.text("Transaction ID", payLabelX, payY + 22);
        doc.font(FONT.regular).fontSize(8).fillColor(C.goldMid);
        doc.text(invoice.transactionId, payValueX, payY + 22);
      }

      // ── AMOUNT SECTION ──
      const amtY = y + planCardH + 12;
      drawCardBright(doc, P, amtY, CW, 62);

      doc.font(FONT.regular).fontSize(9).fillColor(C.goldMid);
      doc.text(`${invoice.planName.charAt(0).toUpperCase() + invoice.planName.slice(1)} Plan - ${cycleLabel} Subscription`, P + 20, amtY + 12);

      doc.font(FONT.bold).fontSize(9).fillColor(C.gold);
      doc.text(formatCurrency(invoice.amount, invoice.currencySymbol), W - P - 20, amtY + 12, { width: 160, align: "right" });

      doc.save();
      doc.moveTo(P + 20, amtY + 28).lineTo(W - P - 20, amtY + 28).lineWidth(0.4).strokeColor(C.goldLine).stroke();
      doc.restore();

      doc.font(FONT.bold).fontSize(10).fillColor(C.goldMid);
      doc.text("Total Due", P + 20, amtY + 36);

      doc.font(FONT.bold).fontSize(20).fillColor(C.goldBright);
      doc.text(formatCurrency(invoice.amount, invoice.currencySymbol), W - P - 20, amtY + 34, { width: 200, align: "right" });

      y = amtY + 62 + 10;

      // ── NOTES ──
      if (invoice.notes) {
        drawCard(doc, P, y, CW, 40);
        doc.font(FONT.bold).fontSize(7).fillColor(C.goldMid);
        doc.text("NOTES", P + 14, y + 8);
        doc.font(FONT.italic).fontSize(8).fillColor(C.goldMid);
        doc.text(invoice.notes, P + 14, y + 20, { width: CW - 28 });
        y += 48;
      }

      // ── ACCEPTED PAYMENT METHODS ──
      if (invoice.platformPaymentMethods && invoice.platformPaymentMethods.length > 0) {
        drawCard(doc, P, y, CW, 30);
        doc.font(FONT.bold).fontSize(7).fillColor(C.goldMid);
        doc.text("ACCEPTED PAYMENT METHODS", P + 14, y + 8);
        const pmText = invoice.platformPaymentMethods
          .map(pm => pm.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()))
          .join("  •  ");
        doc.font(FONT.regular).fontSize(7.5).fillColor(C.goldMid);
        doc.text(pmText, P + 14, y + 17, { width: CW - 28 });
        y += 38;
      }

      // ── FOOTER ──
      const footerY = H - 72;

      doc.save();
      const footerGrad = doc.linearGradient(P, 0, W - P, 0);
      footerGrad.stop(0, "rgba(217,119,6,0)");
      footerGrad.stop(0.3, "rgba(217,119,6,0.4)");
      footerGrad.stop(0.7, "rgba(217,119,6,0.4)");
      footerGrad.stop(1, "rgba(217,119,6,0)");
      doc.moveTo(P, footerY).lineTo(W - P, footerY).lineWidth(1).stroke(footerGrad);
      doc.restore();

      doc.font(FONT.italic).fontSize(9).fillColor(C.gold);
      doc.text(`Thank you for choosing ${platformName}!`, P, footerY + 8, { width: CW, align: "center" });

      const footerParts: string[] = [];
      if (invoice.platformWebsite) footerParts.push(invoice.platformWebsite);
      if (invoice.platformEmail) footerParts.push(invoice.platformEmail);
      if (invoice.platformPhone) footerParts.push(invoice.platformPhone);
      if (invoice.platformWhatsapp) footerParts.push(`WhatsApp: ${invoice.platformWhatsapp}`);

      if (footerParts.length > 0) {
        doc.font(FONT.regular).fontSize(7).fillColor(C.goldDim);
        doc.text(footerParts.join("   |   "), P, footerY + 22, { width: CW, align: "center" });
      }

      const socialParts: string[] = [];
      if (invoice.platformInstagram) socialParts.push(`Instagram: ${invoice.platformInstagram}`);
      if (invoice.platformFacebook) socialParts.push(`Facebook: ${invoice.platformFacebook}`);
      if (invoice.platformTwitter) socialParts.push(`Twitter: ${invoice.platformTwitter}`);

      if (socialParts.length > 0) {
        doc.font(FONT.regular).fontSize(6.5).fillColor(C.goldDim);
        doc.text(socialParts.join("   |   "), P, footerY + 34, { width: CW, align: "center" });
      }

      if (invoice.platformSupportHours) {
        doc.font(FONT.regular).fontSize(6.5).fillColor(C.goldDim);
        doc.text(`Support Hours: ${invoice.platformSupportHours}`, P, footerY + 44, { width: CW, align: "center" });
      }

      // Bottom gold bar
      doc.rect(0, H - 3, W, 3).fill(C.gold);

    } catch (renderErr) {
      hasErrored = true;
      console.error("[PDF Invoice] Render error:", renderErr);
      reject(new Error(`Invoice PDF render failed: ${renderErr instanceof Error ? renderErr.message : String(renderErr)}`));
    }

    if (!hasErrored) {
      try { doc.end(); } catch (e) {
        hasErrored = true;
        reject(new Error(`PDF generation failed: ${e instanceof Error ? e.message : String(e)}`));
      }
    } else {
      try { doc.end(); } catch {}
    }
  });
}

// ============================================================================
// Generate ULTRA PREMIUM Report PDF — BLACK + GOLD Shine
// ENHANCED: Cover page, Executive Summary with trends, Charts, Comparison, Page numbers
// ============================================================================

export async function generateReportPDF(report: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let hasErrored = false;
    const buffers: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      bufferPages: true,
      autoFirstPage: true,
    });

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => { if (!hasErrored) resolve(Buffer.concat(buffers)); });
    doc.on("error", (err) => { hasErrored = true; reject(err); });

    const W = 595.28;
    const H = 841.89;
    const P = 48;
    const CW = W - P * 2;

    // ── SANITIZE ALL STRING INPUTS — prevent null.length errors in pdfkit ──
    const brandName = String(report.brandName || "Valtriox");
    const platformName = String(report.platformName || brandName);
    const hasLogo = !!(report.platformLogo && typeof report.platformLogo === "string" && report.platformLogo.length > 0);
    const hasBrandLogo = !!(report.brandLogo && typeof report.brandLogo === "string" && report.brandLogo.length > 0);
    const accentColor = String(report.brandColor || C.gold);
    const safeOrgName = String(report.orgName || "Organization");
    const safeOrgEmail = report.orgEmail ? String(report.orgEmail) : null;
    const safeTitle = String(report.title || "Report");
    const safeSubtitle = report.subtitle ? String(report.subtitle) : null;
    const safePeriod = String(report.period || "");
    const safeGeneratedAt = String(report.generatedAt || new Date().toLocaleString("en-PK"));
    const safePlan = report.plan ? String(report.plan) : null;
    const safeSummary = report.summary ? String(report.summary) : null;
    const safeTagline = report.platformTagline ? String(report.platformTagline) : null;
    const safePlatformLogo = hasLogo ? report.platformLogo! : null;
    const safeBrandLogo = hasBrandLogo ? report.brandLogo! : null;

    // Check for empty data state
    const isDataEmpty = isEmptyData(report.stats);

    // Build a lookup map for comparison trend matching (label -> change)
    const comparisonMap = new Map<string, number>();
    if (report.comparison) {
      for (const cs of report.comparison.stats) {
        comparisonMap.set(cs.label.toLowerCase(), cs.change);
      }
    }

    try {
      // ── VALIDATE FONT BUFFERS — fail fast if fonts are missing/corrupt ──
      if (!FONT_REGULAR || !FONT_REGULAR.length || !FONT_BOLD || !FONT_BOLD.length) {
        throw new Error(`Font buffers invalid: REGULAR=${FONT_REGULAR?.length ?? 0}, BOLD=${FONT_BOLD?.length ?? 0}`);
      }

      // ── REGISTER FONTS FIRST ──
      ensureFontsRegistered(doc);

      // ====================================================================
      // PAGE 1: COVER PAGE
      // ====================================================================
      doc.rect(0, 0, W, H).fill(C.bg);

      // Subtle radial-like gradient overlay (top)
      doc.save();
      const coverGrad = doc.linearGradient(0, 0, 0, H * 0.6);
      coverGrad.stop(0, C.bg3, 0.2);
      coverGrad.stop(1, C.bg, 1);
      doc.rect(0, 0, W, H * 0.6).fill(coverGrad);
      doc.restore();

      // Bottom subtle gradient
      doc.save();
      const coverGradBot = doc.linearGradient(0, H * 0.7, 0, H);
      coverGradBot.stop(0, C.bg, 0);
      coverGradBot.stop(1, C.bg2, 1);
      doc.rect(0, H * 0.7, W, H * 0.3).fill(coverGradBot);
      doc.restore();

      // Top gold bar
      doc.rect(0, 0, W, 3).fill(accentColor);

      // CONFIDENTIAL watermark (diagonal, very faint)
      doc.save();
      doc.font(FONT.bold).fontSize(72).fillColor(C.goldUltraFaint);
      doc.translate(W / 2, H / 2);
      doc.rotate(-Math.PI / 7);
      doc.text("CONFIDENTIAL", -200, -36, { width: 400, align: "center" });
      doc.restore();

      // Secondary watermark layer (offset)
      doc.save();
      doc.font(FONT.bold).fontSize(48).fillColor(C.goldUltraFaint);
      doc.translate(W / 2 + 40, H / 2 + 60);
      doc.rotate(-Math.PI / 7);
      doc.text("CONFIDENTIAL", -160, -24, { width: 320, align: "center" });
      doc.restore();

      // ── Cover content (centered vertically) ──

      // Decorative top line
      const topDecoY = 180;
      doc.save();
      const decoGrad = doc.linearGradient(W / 2 - 100, 0, W / 2 + 100, 0);
      decoGrad.stop(0, "rgba(217,119,6,0)");
      decoGrad.stop(0.5, "rgba(217,119,6,0.5)");
      decoGrad.stop(1, "rgba(217,119,6,0)");
      doc.moveTo(W / 2 - 100, topDecoY).lineTo(W / 2 + 100, topDecoY).lineWidth(0.8).stroke(decoGrad);
      doc.restore();

      // Diamond accent
      doc.save();
      doc.translate(W / 2, topDecoY);
      doc.rotate(Math.PI / 4);
      doc.rect(-4, -4, 8, 8).fill(accentColor);
      doc.restore();

      // Logo (centered)
      let logoCenterY = topDecoY + 30;
      const logoTargetSize = 60;

      if (hasBrandLogo && safeBrandLogo) {
        const brandParsed = parseBase64DataUri(safeBrandLogo);
        if (brandParsed) {
          try {
            const logoBuffer = Buffer.from(brandParsed.base64, "base64");
            doc.save();
            doc.roundedRect(W / 2 - logoTargetSize / 2 - 4, logoCenterY - 4, logoTargetSize + 8, logoTargetSize + 8, 10).fill(C.goldBg2);
            doc.roundedRect(W / 2 - logoTargetSize / 2 - 4, logoCenterY - 4, logoTargetSize + 8, logoTargetSize + 8, 10).lineWidth(0.5).strokeColor(C.goldBorder2).stroke();
            doc.image(logoBuffer, W / 2 - logoTargetSize / 2, logoCenterY, { width: logoTargetSize, height: logoTargetSize });
            doc.restore();
          } catch {
            renderCoverDefaultLogo(doc, W / 2, logoCenterY, logoTargetSize, accentColor);
          }
        } else {
          renderCoverDefaultLogo(doc, W / 2, logoCenterY, logoTargetSize, accentColor);
        }
      } else if (hasLogo && safePlatformLogo) {
        const logoParsed = parseBase64DataUri(safePlatformLogo);
        if (logoParsed) {
          try {
            const logoBuffer = Buffer.from(logoParsed.base64, "base64");
            doc.save();
            doc.roundedRect(W / 2 - logoTargetSize / 2 - 4, logoCenterY - 4, logoTargetSize + 8, logoTargetSize + 8, 10).fill(C.goldBg2);
            doc.roundedRect(W / 2 - logoTargetSize / 2 - 4, logoCenterY - 4, logoTargetSize + 8, logoTargetSize + 8, 10).lineWidth(0.5).strokeColor(C.goldBorder2).stroke();
            doc.image(logoBuffer, W / 2 - logoTargetSize / 2, logoCenterY, { width: logoTargetSize, height: logoTargetSize });
            doc.restore();
          } catch {
            renderCoverDefaultLogo(doc, W / 2, logoCenterY, logoTargetSize, accentColor);
          }
        } else {
          renderCoverDefaultLogo(doc, W / 2, logoCenterY, logoTargetSize, accentColor);
        }
      } else {
        renderCoverDefaultLogo(doc, W / 2, logoCenterY, logoTargetSize, accentColor);
      }

      logoCenterY += logoTargetSize + 20;

      // Organization name
      doc.save();
      doc.font(FONT.regular).fontSize(14).fillColor(C.goldMid);
      doc.text(safeOrgName, P, logoCenterY, { width: CW, align: "center" });
      doc.restore();
      logoCenterY += 30;

      // Report title (large, bold, gold)
      doc.save();
      doc.font(FONT.bold).fontSize(30).fillColor(C.goldBright);
      doc.text(safeTitle, P, logoCenterY, { width: CW, align: "center" });
      doc.restore();
      logoCenterY += 42;

      // Subtitle
      if (safeSubtitle) {
        doc.save();
        doc.font(FONT.italic).fontSize(12).fillColor(C.gold);
        doc.text(safeSubtitle, P, logoCenterY, { width: CW, align: "center" });
        doc.restore();
        logoCenterY += 22;
      }

      // Period badge
      doc.save();
      const periodW = 220;
      const periodH = 30;
      doc.roundedRect(W / 2 - periodW / 2, logoCenterY, periodW, periodH, 6).fill(C.goldBg2);
      doc.roundedRect(W / 2 - periodW / 2, logoCenterY, periodW, periodH, 6).lineWidth(0.5).strokeColor(C.goldBorder2).stroke();
      doc.font(FONT.regular).fontSize(10).fillColor(C.gold);
      doc.text(safePeriod, W / 2 - periodW / 2 + 8, logoCenterY + 9, { width: periodW - 16, align: "center" });
      doc.restore();
      logoCenterY += periodH + 16;

      // Plan badge (if exists)
      if (safePlan) {
        doc.save();
        const planW = 140;
        const planH = 22;
        doc.roundedRect(W / 2 - planW / 2, logoCenterY, planW, planH, 4).fill(C.goldBg);
        doc.roundedRect(W / 2 - planW / 2, logoCenterY, planW, planH, 4).lineWidth(0.3).strokeColor(C.goldBorder).stroke();
        doc.font(FONT.bold).fontSize(8).fillColor(C.goldMid);
        doc.text(safePlan, W / 2 - planW / 2 + 4, logoCenterY + 7, { width: planW - 8, align: "center" });
        doc.restore();
        logoCenterY += planH + 14;
      }

      // Decorative bottom line
      doc.save();
      const decoGrad2 = doc.linearGradient(W / 2 - 100, 0, W / 2 + 100, 0);
      decoGrad2.stop(0, "rgba(217,119,6,0)");
      decoGrad2.stop(0.5, "rgba(217,119,6,0.5)");
      decoGrad2.stop(1, "rgba(217,119,6,0)");
      doc.moveTo(W / 2 - 100, logoCenterY).lineTo(W / 2 + 100, logoCenterY).lineWidth(0.8).stroke(decoGrad2);
      doc.restore();

      // Diamond accent (bottom)
      doc.save();
      doc.translate(W / 2, logoCenterY);
      doc.rotate(Math.PI / 4);
      doc.rect(-4, -4, 8, 8).fill(accentColor);
      doc.restore();

      // Bottom cover info
      const coverBottomY = H - 100;
      doc.save();
      doc.font(FONT.regular).fontSize(8).fillColor(C.goldDim);
      doc.text(`Generated on ${safeGeneratedAt}`, P, coverBottomY, { width: CW, align: "center" });
      doc.restore();

      if (safeTagline || safeOrgEmail) {
        doc.save();
        doc.font(FONT.italic).fontSize(8).fillColor(C.goldDim);
        const taglineText = safeTagline || `Prepared for ${safeOrgName}`;
        doc.text(taglineText, P, coverBottomY + 14, { width: CW, align: "center" });
        doc.restore();
      }

      // Footer contact on cover
      const coverContactParts: string[] = [];
      if (report.platformWebsite) coverContactParts.push(String(report.platformWebsite));
      if (safeOrgEmail) coverContactParts.push(safeOrgEmail);
      if (report.platformPhone) coverContactParts.push(String(report.platformPhone));
      if (coverContactParts.length > 0) {
        doc.save();
        doc.font(FONT.regular).fontSize(7).fillColor(C.goldDim);
        doc.text(coverContactParts.join("   |   "), P, coverBottomY + 32, { width: CW, align: "center" });
        doc.restore();
      }

      // Bottom gold bar
      doc.rect(0, H - 3, W, 3).fill(accentColor);

      // ====================================================================
      // PAGE 2+: CONTENT PAGES
      // ====================================================================
      doc.addPage();

      // Standard content page background
      function drawContentPageBg() {
        doc.rect(0, 0, W, H).fill(C.bg);
        const gradient = doc.linearGradient(0, 0, W, 120);
        gradient.stop(0, C.bg3, 0.15);
        gradient.stop(1, C.bg, 1);
        doc.rect(0, 0, W, 120).fill(gradient);
        doc.rect(0, 0, W, 3).fill(accentColor);
      }

      drawContentPageBg();

      let tableY = P + 6;

      // ── CONTENT HEADER ──
      let contentLogoRightX = P;
      if (hasLogo && safePlatformLogo) {
        const logoParsed = parseBase64DataUri(safePlatformLogo);
        if (logoParsed) {
          try {
            const logoBuffer = Buffer.from(logoParsed.base64, "base64");
            doc.save();
            doc.roundedRect(P, tableY, 32, 32, 5).fill(C.goldBg2);
            doc.roundedRect(P, tableY, 32, 32, 5).lineWidth(0.4).strokeColor(C.goldBorder2).stroke();
            doc.image(logoBuffer, P + 3, tableY + 3, { width: 26, height: 26 });
            doc.restore();
            contentLogoRightX = P + 40;
          } catch {
            contentLogoRightX = renderDefaultLogo(doc, P, tableY);
          }
        } else {
          contentLogoRightX = renderDefaultLogo(doc, P, tableY);
        }
      } else {
        contentLogoRightX = renderDefaultLogo(doc, P, tableY);
      }

      doc.font(FONT.bold).fontSize(14).fillColor(C.goldBright);
      doc.text(safeTitle, contentLogoRightX, tableY + 2);

      doc.font(FONT.italic).fontSize(8).fillColor(C.goldMid);
      doc.text(safeSubtitle || "Business Analytics Report", contentLogoRightX, tableY + 20);

      // Period badge (top right)
      doc.save();
      doc.roundedRect(W - P - 160, tableY + 4, 160, 18, 4).fill(C.goldBg);
      doc.roundedRect(W - P - 160, tableY + 4, 160, 18, 4).lineWidth(0.3).strokeColor(C.goldBorder).stroke();
      doc.font(FONT.regular).fontSize(7.5).fillColor(C.gold);
      doc.text(safePeriod, W - P - 155, tableY + 9, { width: 150, align: "center" });
      doc.restore();

      goldLine(doc, P, tableY + 36, W - P, tableY + 36, 0.6);

      doc.font(FONT.regular).fontSize(8).fillColor(C.gold);
      let orgInfo = `Prepared for: ${safeOrgName}`;
      if (safeOrgEmail) orgInfo += `  |  ${safeOrgEmail}`;
      doc.text(orgInfo, P, tableY + 42, { width: CW });

      doc.font(FONT.regular).fontSize(7).fillColor(C.goldDim);
      doc.text(`Generated: ${safeGeneratedAt}`, P, tableY + 54);

      goldLine(doc, P, tableY + 66, W - P, tableY + 66, 0.4);

      tableY = tableY + 76;

      // ── EMPTY STATE CHECK ──
      if (isDataEmpty) {
        drawEmptyState(doc, P, tableY, CW, W, H);
        // Still add page numbers at the end (below)
      } else {
        // ── EXECUTIVE SUMMARY: KPI CARDS WITH TREND ARROWS ──
        doc.font(FONT.bold).fontSize(12).fillColor(C.goldBright);
        doc.text("Executive Summary", P, tableY);
        tableY += 20;

        if (report.stats && report.stats.length > 0) {
          const numCards = report.stats.length;
          const gap = 10;
          const cardW2 = (CW - (numCards - 1) * gap) / numCards;
          const cardH = 65;

          report.stats.forEach((stat, idx) => {
            const cx = P + idx * (cardW2 + gap);
            drawCardBright(doc, cx, tableY, cardW2, cardH, 6);

            // Label
            doc.font(FONT.bold).fontSize(6.5).fillColor(C.goldMid);
            doc.text(String(stat.label || "").toUpperCase(), cx + 10, tableY + 8, { width: cardW2 - 20 });

            // Value
            doc.font(FONT.bold).fontSize(18).fillColor(C.goldBright);
            doc.text(String(stat.value ?? 0), cx + 10, tableY + 22, { width: cardW2 - 20 });

            // Trend indicator (look up from comparison data)
            const safeLabel = String(stat.label || "").toLowerCase();
            const change = comparisonMap.get(safeLabel);
            if (change !== undefined && change !== null) {
              drawTrendIndicator(doc, cx + 10, tableY + 46, change, FONT.bold);
            }
          });

          tableY += cardH + 16;
        }

        // ── CHARTS SECTION ──

        // Trend / Vertical Bar Chart (revenue over time)
        if (report.trendChartData && report.trendChartData.length > 0) {
          tableY = ensureSpace(doc, tableY, 230, W, H, P);

          doc.font(FONT.bold).fontSize(12).fillColor(C.goldBright);
          doc.text("Revenue Trend", P, tableY);
          tableY += 18;

          drawVerticalBarChart(doc, P, tableY, CW, 200, report.trendChartData, "", FONT.regular);
          tableY += 210;
        }

        // Horizontal Bar Chart (top items)
        if (report.barChartData && report.barChartData.length > 0) {
          const barChartH = Math.min(report.barChartData.length * 26 + 40, 320);
          tableY = ensureSpace(doc, tableY, barChartH + 30, W, H, P);

          doc.font(FONT.bold).fontSize(12).fillColor(C.goldBright);
          doc.text("Top Items", P, tableY);
          tableY += 18;

          drawHorizontalBarChart(doc, P, tableY, CW, barChartH, report.barChartData, "", FONT.regular);
          tableY += barChartH + 16;
        }

        // Pie / Donut Chart (distribution)
        if (report.pieChartData && report.pieChartData.length > 0) {
          tableY = ensureSpace(doc, tableY, 260, W, H, P);

          doc.font(FONT.bold).fontSize(12).fillColor(C.goldBright);
          doc.text("Distribution", P, tableY);
          tableY += 18;

          // Donut chart centered
          const donutRadius = 80;
          const donutCx = P + CW / 2;
          const donutCy = tableY + donutRadius + 10;
          drawDonutChart(doc, donutCx, donutCy, donutRadius, report.pieChartData, FONT.regular);
          tableY += donutRadius * 2 + 80;
        }

        // ── COMPARISON TABLE ──
        if (report.comparison && report.comparison.stats && report.comparison.stats.length > 0) {
          const safeCompStats = report.comparison.stats.filter(s => s != null);
          if (safeCompStats.length === 0) { /* skip */ } else {
          const compTableH = (safeCompStats.length + 1) * 24 + 40;
          tableY = ensureSpace(doc, tableY, compTableH + 30, W, H, P);

          doc.font(FONT.bold).fontSize(12).fillColor(C.goldBright);
          doc.text(`Period Comparison vs ${String(report.comparison.previousPeriodLabel || "Previous")}`, P, tableY);
          tableY += 18;

          const compHeaders = ["Metric", "Current Period", "Previous Period", "Change"];
          const compRows = safeCompStats.map((s) => [
            String(s.label || ""),
            typeof s.currentValue === "number" ? s.currentValue.toLocaleString("en-PK") : String(s.currentValue ?? 0),
            typeof s.previousValue === "number" ? s.previousValue.toLocaleString("en-PK") : String(s.previousValue ?? 0),
            typeof s.change === "number" ? s.change : 0,
          ]);

          const colWidths = [CW * 0.3, CW * 0.25, CW * 0.25, CW * 0.2];
          const tblH = (compRows.length + 1) * 24 + 12;
          drawCard(doc, P, tableY, CW, tblH, 6);

          // Header row
          let colX = P + 10;
          compHeaders.forEach((header, i) => {
            doc.font(FONT.bold).fontSize(7).fillColor(C.goldMid);
            doc.text(header.toUpperCase(), colX, tableY + 10, { width: colWidths[i] - 16 });
            colX += colWidths[i];
          });

          // Header divider
          doc.save();
          doc.moveTo(P + 8, tableY + 24).lineTo(W - P - 8, tableY + 24).lineWidth(0.4).strokeColor(C.goldLine).stroke();
          doc.restore();

          // Data rows
          compRows.forEach((row, ri) => {
            const ry = tableY + 28 + ri * 24;

            // Alternating row background
            if (ri % 2 === 0) {
              doc.save();
              doc.rect(P + 4, ry - 2, CW - 8, 24).fill(C.goldBg);
              doc.restore();
            }

            colX = P + 10;
            row.forEach((cell, ci) => {
              if (ci === 3) {
                // Change column — special formatting
                const change = cell as number;
                const isPositive = change >= 0;
                const arrow = isPositive ? "▲" : "▼";
                const color = isPositive ? C.green : C.red;
                const changeText = `${arrow} ${Math.abs(change).toFixed(1)}%`;

                doc.font(FONT.bold).fontSize(8).fillColor(color);
                doc.text(changeText, colX, ry + 3, { width: colWidths[ci] - 16 });
              } else {
                doc.font(FONT.regular).fontSize(8).fillColor(C.gold);
                doc.text(String(cell), colX, ry + 3, { width: colWidths[ci] - 16 });
              }
              colX += colWidths[ci];
            });
          });

          tableY += tblH + 16;
          } // end safeCompStats check
        }

        // ── DATA TABLES (enhanced with alternating row colors) ──
        if (report.tables && Array.isArray(report.tables) && report.tables.length > 0) {
          report.tables.forEach((table) => {
          if (!table || !table.headers || !table.rows || !Array.isArray(table.headers) || !Array.isArray(table.rows)) return;
          const rowCount = table.rows.length;
          const tblH = Math.max((rowCount + 1) * 22 + 8, 40);

          tableY = ensureSpace(doc, tableY, tblH + 34, W, H, P);

          doc.font(FONT.bold).fontSize(11).fillColor(C.goldBright);
          doc.text(String(table.title || "Data Table"), P, tableY);
          tableY += 18;

          drawCard(doc, P, tableY, CW, tblH, 6);

          const safeHeaders = table.headers.filter(h => h != null);
          const colW = safeHeaders.length > 0 ? CW / safeHeaders.length : CW;
          safeHeaders.forEach((header, i) => {
            doc.font(FONT.bold).fontSize(7).fillColor(C.goldMid);
            doc.text(String(header).toUpperCase(), P + 10 + i * colW, tableY + 9, { width: colW - 20 });
          });

          doc.save();
          doc.moveTo(P + 8, tableY + 22).lineTo(W - P - 8, tableY + 22).lineWidth(0.4).strokeColor(C.goldLine).stroke();
          doc.restore();

          if (rowCount === 0) {
            doc.font(FONT.italic).fontSize(9).fillColor(C.goldDim);
            doc.text("No data available for this period", P, tableY + 30, { width: CW, align: "center" });
          } else {
            table.rows.forEach((row, ri) => {
              if (!row || !Array.isArray(row)) return;
              const ry = tableY + 26 + ri * 22;

              // Alternating row color (subtle gold background)
              if (ri % 2 === 0) {
                doc.save();
                doc.rect(P + 4, ry - 1, CW - 8, 22).fill(C.goldBg);
                doc.restore();
              }

              row.forEach((cell, ci) => {
                doc.font(FONT.regular).fontSize(8).fillColor(C.gold);
                doc.text(String(cell ?? ""), P + 10 + ci * colW, ry, { width: colW - 20 });
              });
            });
          }

          tableY += tblH + 14;
        });
        }

        // ── SUMMARY ──
        if (safeSummary) {
          tableY = ensureSpace(doc, tableY, 60, W, H, P);
          drawCard(doc, P, tableY, CW, 38);
          doc.font(FONT.bold).fontSize(7).fillColor(C.goldMid);
          doc.text("SUMMARY", P + 14, tableY + 8);
          doc.font(FONT.regular).fontSize(8).fillColor(C.gold);
          doc.text(safeSummary, P + 14, tableY + 20, { width: CW - 28 });
          tableY += 48;
        }
      }

      // ====================================================================
      // PAGE NUMBERS (on all pages except cover page = index 0)
      // ====================================================================
      const range = doc.bufferedPageRange();
      for (let i = 1; i < range.count; i++) {
        doc.switchToPage(range.start + i);

        // Bottom gold bar
        doc.rect(0, H - 3, W, 3).fill(accentColor);

        // Footer line
        doc.save();
        const fGrad = doc.linearGradient(P, 0, W - P, 0);
        fGrad.stop(0, "rgba(217,119,6,0)");
        fGrad.stop(0.5, "rgba(217,119,6,0.4)");
        fGrad.stop(1, "rgba(217,119,6,0)");
        doc.moveTo(P, H - 50).lineTo(W - P, H - 50).lineWidth(0.5).stroke(fGrad);
        doc.restore();

        // Powered by
        doc.save();
        doc.font(FONT.italic).fontSize(7).fillColor(C.gold);
        doc.text(`Powered by ${platformName} - The Universal Brand Management Portal`, P, H - 44, { width: CW, align: "center" });
        doc.restore();

        // Page number: "Page X of Y"
        doc.save();
        doc.font(FONT.regular).fontSize(7).fillColor(C.goldDim);
        const pageLabel = `Page ${i} of ${range.count - 1}`;
        doc.text(pageLabel, P, H - 14, { width: CW, align: "center" });
        doc.restore();

        // Footer contact info on last content page
        if (i === range.count - 1) {
          const footerParts: string[] = [];
          if (report.platformWebsite) footerParts.push(String(report.platformWebsite));
          if (safeOrgEmail) footerParts.push(safeOrgEmail);
          if (report.platformPhone) footerParts.push(String(report.platformPhone));

          if (footerParts.length > 0) {
            doc.save();
            doc.font(FONT.regular).fontSize(6.5).fillColor(C.goldDim);
            doc.text(footerParts.join("   |   "), P, H - 26, { width: CW, align: "center" });
            doc.restore();
          }
        }
      }

    } catch (renderErr) {
      hasErrored = true;
      console.error("[PDF Report] Render error:", renderErr);
      console.error("[PDF Report] Stack:", renderErr instanceof Error ? renderErr.stack : 'N/A');
      reject(new Error(`Report PDF render failed: ${renderErr instanceof Error ? renderErr.message : String(renderErr)}`));
    }

    if (!hasErrored) {
      try { doc.end(); } catch (e) {
        hasErrored = true;
        reject(new Error(`Report PDF generation failed: ${e instanceof Error ? e.message : String(e)}`));
      }
    } else {
      try { doc.end(); } catch {}
    }
  });
}

// ============================================================================
// Cover Page Logo Helper — Renders a larger centered logo for the cover page
// ============================================================================

function renderCoverDefaultLogo(doc: any, centerX: number, y: number, size: number, color: string): void {
  doc.save();
  doc.roundedRect(centerX - size / 2 - 4, y - 4, size + 8, size + 8, 10).fill(C.goldBg2);
  doc.roundedRect(centerX - size / 2 - 4, y - 4, size + 8, size + 8, 10).lineWidth(0.5).strokeColor(C.goldBorder2).stroke();
  doc.roundedRect(centerX - size / 2, y, size, size, 8).fill(color);
  doc.fontSize(size * 0.35).fillColor(C.bg);
  doc.font(FONT.bold).text("VTX", centerX - size / 2, y + size * 0.3, { width: size, align: "center" });
  doc.restore();
}

// ============================================================================
// Empty State Drawing Helper
// ============================================================================

function drawEmptyState(doc: any, x: number, y: number, w: number, _W: number, _H: number): void {
  const centerY = y + 120;

  // Icon placeholder — large gold circle with "!" inside
  doc.save();
  doc.circle(x + w / 2, centerY - 20, 36).lineWidth(1.5).strokeColor(C.goldBorder2).stroke();
  doc.circle(x + w / 2, centerY - 20, 36).fill(C.goldBg);
  doc.font(FONT.bold).fontSize(28).fillColor(C.goldDim);
  doc.text("!", x + w / 2 - 6, centerY - 35);
  doc.restore();

  // Main message
  doc.save();
  doc.font(FONT.bold).fontSize(14).fillColor(C.gold);
  doc.text("No Data Available", x, centerY + 30, { width: w, align: "center" });
  doc.restore();

  // Subtitle
  doc.save();
  doc.font(FONT.regular).fontSize(10).fillColor(C.goldDim);
  doc.text("There is no data available for this reporting period.", x, centerY + 54, { width: w, align: "center" });
  doc.restore();

  // Hint
  doc.save();
  doc.font(FONT.italic).fontSize(8).fillColor(C.goldFaint);
  doc.text("Data will appear here once transactions or activity are recorded.", x, centerY + 76, { width: w, align: "center" });
  doc.restore();
}
