// ============================================================================
// PDF Generator - Valtriox - Premium Invoice & Report PDFs
// Uses pdfkit with EMBEDDED TTF fonts (base64 in font-buffers.ts)
// Serverless-safe - no filesystem dependency for fonts
// SOFT LIGHT PREMIUM Theme - Clean whites, warm creams, dark text hierarchy
// ============================================================================

import PDFDocument from "pdfkit";
import { FONT_REGULAR, FONT_BOLD, FONT_ITALIC, FONT_BOLD_ITALIC } from "./font-buffers";
import { safeDate } from "@/lib/utils-extended";
import { getBrandLogoBuffer, BRAND_LOGO_ASPECT } from "./brand-logo";

// PDFKit.PDFDocument is missing the `arc` method in @types/pdfkit.
// Cast to this type where arc is needed (donut chart rendering).
type PDFDocWithArc = PDFKit.PDFDocument & {
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): PDFDocWithArc;
};

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

function ensureFontsRegistered(doc: PDFKit.PDFDocument): void {
  // CRITICAL: Validate ALL 4 font buffers before registering.
  // If any font buffer is null/undefined, pdfkit's registerFont internally
  // accesses .length on the source and throws: "Cannot read properties of null (reading 'length')"
  const fonts = [
    { name: FONT.regular, buf: FONT_REGULAR, label: 'REGULAR' },
    { name: FONT.bold, buf: FONT_BOLD, label: 'BOLD' },
    { name: FONT.italic, buf: FONT_ITALIC, label: 'ITALIC' },
    { name: FONT.boldItalic, buf: FONT_BOLD_ITALIC, label: 'BOLD_ITALIC' },
  ];
  for (const f of fonts) {
    if (!f.buf || typeof f.buf.length !== 'number' || f.buf.length === 0) {
      throw new Error(`Font buffer ${f.label} is invalid (type=${typeof f.buf}, length=${f.buf?.length ?? 'N/A'})`);
    }
    try {
      doc.registerFont(f.name, f.buf);
    } catch (fontErr: unknown) {
      const fontErrMsg = fontErr instanceof Error ? fontErr.message : String(fontErr);
      console.error(`[PDF] Font registration failed for ${f.label}:`, fontErrMsg);
      // Only throw for REGULAR and BOLD (essential fonts);
      // ITALIC/BOLD_ITALIC can fall back to REGULAR/BOLD
      if (f.label === 'REGULAR' || f.label === 'BOLD') {
        throw new Error(`Critical font ${f.label} failed to register: ${fontErrMsg}`);
      }
      // For italic/bold-italic, try to register with regular/bold as fallback
      try {
        doc.registerFont(f.name, f.label === 'ITALIC' ? FONT_REGULAR : FONT_BOLD);
      } catch {}
    }
  }
}

// ── Types ──

export interface InvoiceData {
  invoiceNumber: string;
  status: "draft" | "pending" | "sent" | "paid" | "approved" | "cancelled" | "refunded" | "overdue";
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
  // ── Phase 2: Custom Invoice Fields ──
  invoiceType?: "subscription" | "order" | "custom";
  invoiceTitle?: string;
  lineItems?: Array<{
    description: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;
  approvedBy?: string;
  approvedAt?: Date | null;
  sentAt?: Date | null;
  paymentStatus?: "unpaid" | "pending_verification" | "verified" | "rejected";
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

// ── Color Constants — Valtriox Brand 2026 (Charcoal / Modern Gold / White) ──
// Updated palette per brand spec:
//   Charcoal    #161B26  (primary dark — headers, footers, table headers, primary text)
//   Modern Gold #D4A73A  (accent — gold lines, titles, badges)
//   White       #FAFAFA  (page background — slightly off-white for premium feel)

const C = {
  // Page & Card Backgrounds
  bg: "#FAFAFA",          // White (per brand spec)
  bg2: "#F4F4F5",         // Slightly darker for layered surfaces
  bg3: "#EFEFEF",         // Cards / panel backgrounds
  white: "#FAFAFA",       // Explicit alias
  // Premium Charcoal (primary dark)
  charcoal: "#161B26",
  darkPremium: "#161B26",
  // Gold Accent Hierarchy
  goldBright: "#B8942F",
  gold: "#D4A73A",        // Modern Gold
  goldMid: "#D4A73A",
  goldDim: "#A58829",
  goldFaint: "#785e0a",
  goldUltraFaint: "#5c4808",
  // Card backgrounds (soft cream/warm whites — kept for premium feel)
  goldBg: "#FFFEFB",
  goldBg2: "#FEFCF5",
  goldBg3: "#FDF8E8",
  // Borders (warm grays)
  goldBorder: "#E8DCC8",
  goldBorder2: "#D4C5A0",
  goldLine: "#DDD0B8",
  // Text hierarchy (on light bg)
  textPrimary: "#161B26",   // Charcoal — primary text
  textSecondary: "#334155",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  textFaint: "#CBD5E1",
  // Status Colors
  green: "#059669",
  greenBg: "#ECFDF5",
  yellow: "#D97706",
  yellowBg: "#FFFBEB",
  red: "#DC2626",
  redBg: "#FEF2F2",
  slate: "#64748B",
  slateBg: "#F1F5F9",
};

// ── Helpers ──

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

function goldLine(doc: PDFKit.PDFDocument, x1: number, y1: number, x2: number, y2: number, width: number = 0.5) {
  doc.save().moveTo(x1, y1).lineTo(x2, y2).lineWidth(width).strokeColor(C.goldBorder).stroke().restore();
}

function drawCard(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, radius: number = 8) {
  doc.save();
  doc.roundedRect(x, y, w, h, radius).fill(C.goldBg);
  doc.roundedRect(x, y, w, h, radius).lineWidth(0.5).strokeColor(C.goldBorder).stroke();
  doc.restore();
}

function drawCardBright(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, radius: number = 8) {
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

// Helper: render default Valtriox logo and return right X position
async function renderDefaultLogo(doc: PDFKit.PDFDocument, x: number, y: number): Promise<number> {
  // Always use the complete founder-uploaded logo in an aspect-matched frame.
  drawBrandLogoFrame(doc, x, y, 44, {
    boxHeight: 44 * BRAND_LOGO_ASPECT,
    bgColor: C.goldBg2,
    padding: 0,
  });
  return x + 56;
}

// ── Brand Logo Helpers (complete founder logo, aspect-matched golden frame) ──
// Per founder directive, this logo is the SOLE brand mark on every PDF
// (invoices, reports, proposals, lead magnets) regardless of which org
// the document belongs to. The border is solid (not rounded) in Modern Gold.

interface BrandLogoOptions {
  /** Optional frame height. Defaults to boxSize for legacy square layouts. */
  boxHeight?: number;
  /** Background fill inside the border. Defaults to C.goldBg2 (cream). */
  bgColor?: string;
  /** Border color. Defaults to C.gold (#D4A73A — Modern Gold). */
  borderColor?: string;
  /** Border thickness in points. Defaults to 1.2. */
  borderWidth?: number;
  /** Inner padding (space between logo and border). Defaults to ~8% of boxSize. */
  padding?: number;
}

/**
 * Render the brand logo with a golden frame at the given top-left corner.
 * @returns The width consumed (boxSize) for layout advancement.
 */
function drawBrandLogoFrame(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  boxSize: number,
  opts?: BrandLogoOptions,
): number {
  const bgColor = opts?.bgColor ?? C.goldBg2;
  const borderColor = opts?.borderColor ?? C.gold;
  const borderWidth = opts?.borderWidth ?? 1.2;
  const padding = opts?.padding ?? Math.max(2, boxSize * 0.08);
  const boxHeight = opts?.boxHeight ?? boxSize;
  const buffer = getBrandLogoBuffer();

  doc.save();
  // Match the frame to the complete logo's aspect ratio so no empty bands appear.
  doc.rect(x, y, boxSize, boxHeight).fill(bgColor);
  doc.rect(x, y, boxSize, boxHeight).lineWidth(borderWidth).strokeColor(borderColor).stroke();

  if (buffer) {
    try {
      // Center the complete 1209x999 logo inside the frame without distortion.
      const innerWidth = Math.max(0, boxSize - padding * 2);
      const innerHeight = Math.max(0, boxHeight - padding * 2);
      let drawW = innerWidth;
      let drawH = innerWidth * BRAND_LOGO_ASPECT;
      if (drawH > innerHeight) {
        drawH = innerHeight;
        drawW = innerHeight / BRAND_LOGO_ASPECT;
      }
      const imgX = x + (boxSize - drawW) / 2;
      const imgY = y + (boxHeight - drawH) / 2;
      doc.image(buffer, imgX, imgY, { width: drawW, height: drawH });
    } catch {
      // border + bg already drawn; ignore image errors
    }
  } else {
    // Fallback: framed VTX text.
    doc.fontSize(boxSize * 0.35).fillColor("#ffffff");
    doc.font(FONT.bold).text("VTX", x, y + boxHeight * 0.3, { width: boxSize, align: "center" });
  }
  doc.restore();
  return boxSize;
}

/**
 * Render the brand logo centered horizontally with a golden frame.
 * Used on cover pages (report / proposal / lead magnet).
 * @returns The Y position just below the logo (for layout advancement).
 */
function drawBrandLogoFrameCentered(
  doc: PDFKit.PDFDocument,
  centerX: number,
  y: number,
  boxSize: number,
  opts?: BrandLogoOptions,
): number {
  const x = centerX - boxSize / 2;
  drawBrandLogoFrame(doc, x, y, boxSize, opts);
  return y + (opts?.boxHeight ?? boxSize);
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
function drawTrendIndicator(doc: PDFKit.PDFDocument, x: number, y: number, change: number, font?: string): number {
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
 * Bars rendered with gold gradient fill on light card background.
 * Includes horizontal grid lines, Y-axis labels, X-axis labels, and value labels above bars.
 */
function drawVerticalBarChart(
  doc: PDFKit.PDFDocument,
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
    doc.moveTo(chartX, gy).lineTo(chartX + chartW, gy).lineWidth(0.3).strokeColor(C.goldBorder).stroke();
    doc.restore();

    // Y-axis label
    doc.save();
    doc.font(fn).fontSize(6.5).fillColor(C.textLight);
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
    doc.rect(bx, by, barWidth, barH).lineWidth(0.3).strokeColor(C.goldBorder).stroke();
    doc.restore();

    // Value label above bar
    doc.save();
    doc.font(fn).fontSize(6).fillColor(C.gold);
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
    doc.font(fn).fontSize(6).fillColor(C.textLight);
    // Truncate long labels
    let lbl = String(item.label || "");
    if (lbl.length > 8) lbl = lbl.substring(0, 7) + "…";
    doc.text(lbl, bx - 2, chartY + chartH + 6, { width: barWidth + 4, align: "center" });
    doc.restore();
  });

  // Baseline axis
  doc.save();
  doc.moveTo(chartX, chartY + chartH).lineTo(chartX + chartW, chartY + chartH).lineWidth(0.6).strokeColor(C.goldBorder).stroke();
  doc.restore();
}

/**
 * Draws a horizontal bar chart for top items (products, customers, etc.).
 * Labels on the left, gold bars extending right, values at the end.
 */
function drawHorizontalBarChart(
  doc: PDFKit.PDFDocument,
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
    doc.font(fn).fontSize(7.5).fillColor(C.textPrimary);
    let lbl = String(item.label || "");
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
    doc.roundedRect(barAreaX, by, barW, barH, 3).lineWidth(0.3).strokeColor(C.goldBorder).stroke();
    doc.restore();

    // Value at the end of bar
    doc.save();
    doc.font(fn).fontSize(7).fillColor(C.gold);
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
  doc: PDFKit.PDFDocument,
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
    (doc as PDFDocWithArc).arc(cx, cy, outerR, currentAngle, endAngle, false);
    doc.lineTo(ix1, iy1);
    (doc as PDFDocWithArc).arc(cx, cy, innerR, endAngle, currentAngle, true);
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
  doc.font(FONT.bold).fontSize(14).fillColor(C.gold);
  doc.text(String(Math.round(total)), cx - 30, cy - 12, { width: 60, align: "center" });
  doc.font(FONT.regular).fontSize(6.5).fillColor(C.textLight);
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
    doc.font(fn).fontSize(6.5).fillColor(C.textSecondary);
    let lbl = String(item.label || "");
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
function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number, W: number, H: number, P: number): number {
  if (y + needed > H - 80) {
    doc.addPage();
    doc.rect(0, 0, W, H).fill(C.bg);
    doc.rect(0, 0, W, 3).fill(C.gold);
    return P + 10;
  }
  return y;
}

// ============================================================================
// Generate SOFT LIGHT PREMIUM Invoice PDF - Light Background + Gold Accents
// ============================================================================

export async function generateInvoicePDF(invoice: InvoiceData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
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
      // ── REGISTER FONTS FIRST - throws immediately if failed ──
      ensureFontsRegistered(doc);

      // ── FULL PAGE LIGHT BACKGROUND ──
      doc.rect(0, 0, W, H).fill(C.bg);

      // Watermark plan check (will be drawn at the end, on top of all content)
      const planLower = (invoice.planName || "").toLowerCase();
      const showWatermark = planLower.includes("professional") || planLower.includes("enterprise");

      // Subtle gradient header area
      doc.save();
      const hdrGrad = doc.linearGradient(0, 0, W, 150);
      hdrGrad.stop(0, C.goldBg3, 0.5);
      hdrGrad.stop(1, C.bg, 1);
      doc.rect(0, 0, W, 150).fill(hdrGrad);
      doc.restore();

      // ── TOP GOLD ACCENT BAR ──
      doc.rect(0, 0, W, 3).fill(C.gold);

      // ── HEADER SECTION ──
      let y = 18;
      let headerRightStartX = P + 200;

      // LEFT: Logo + Company Name
      // Complete logo fills its aspect-matched frame edge-to-edge.
      drawBrandLogoFrame(doc, P, y, 44, {
        boxHeight: 44 * BRAND_LOGO_ASPECT,
        bgColor: C.goldBg2,
        borderColor: C.gold,
        borderWidth: 1.2,
        padding: 0,
      });
      headerRightStartX = P + 56;

      // Company Name - dark text
      doc.font(FONT.bold).fontSize(20).fillColor(C.textPrimary);
      doc.text(platformName, headerRightStartX, y + 2);

      // Slogan - from DB or default
      doc.font(FONT.italic).fontSize(8).fillColor(C.textLight);
      doc.text(invoice.platformTagline || "COMMAND YOUR BRAND UNIVERSE", headerRightStartX, y + 24);

      // Platform contact info (right side of header)
      const rx = W - P;
      doc.font(FONT.regular).fontSize(7).fillColor(C.textMuted);

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

      // INVOICE title - gold accent, right side
      doc.font(FONT.bold).fontSize(32).fillColor(C.gold);
      doc.text("INVOICE", rx - 160, y + 26, { width: 160, align: "right" });

      y += 58;

      // ── INVOICE HEADER TEXT (gold banner) ──
      if (invoice.platformInvoiceHeaderText) {
        doc.save();
        doc.roundedRect(P, y, CW, 22, 4).fill(C.goldBg3);
        doc.roundedRect(P, y, CW, 22, 4).lineWidth(0.3).strokeColor(C.goldBorder).stroke();
        doc.font(FONT.italic).fontSize(8).fillColor(C.goldDim);
        doc.text(invoice.platformInvoiceHeaderText, P + 12, y + 7, { width: CW - 24, align: "center" });
        doc.restore();
        y += 28;
      }

      // ── GOLD DIVIDER ──
      goldLine(doc, P, y, W - P, y, 0.8);
      y += 12;

      // ── STATUS BADGE ──
      const statusMap: Record<string, { color: string; bg: string; label: string }> = {
        pending: { color: C.yellow, bg: C.yellowBg, label: "PENDING" },
        paid: { color: C.green, bg: C.greenBg, label: "PAID" },
        approved: { color: C.green, bg: C.greenBg, label: "APPROVED" },
        cancelled: { color: C.slate, bg: C.slateBg, label: "CANCELLED" },
        refunded: { color: C.red, bg: C.redBg, label: "REFUNDED" },
      };
      const st = statusMap[invoice.status] || statusMap.pending;

      doc.save();
      doc.roundedRect(rx - 110, y, 110, 18, 4).fill(st.bg);
      doc.rect(rx - 110, y, 3, 18).fill(st.color);
      doc.font(FONT.bold).fontSize(8).fillColor(st.color);
      doc.text(st.label, rx - 102, y + 5, { width: 96, align: "center" });
      doc.restore();

      // ── BILLED TO (left) + INVOICE DETAILS (right) ──
      const leftColW = CW * 0.48;
      const rightColX = P + leftColW + 24;
      const billedToStartY = y + 26;

      doc.font(FONT.bold).fontSize(7).fillColor(C.textMuted);
      doc.text("BILLED TO", P, billedToStartY);

      doc.font(FONT.bold).fontSize(13).fillColor(C.textPrimary);
      doc.text(invoice.orgName, P, billedToStartY + 12);

      doc.font(FONT.regular).fontSize(8).fillColor(C.textSecondary);
      let detailY = billedToStartY + 28;
      if (invoice.orgEmail) { doc.text(invoice.orgEmail, P, detailY); detailY += 13; }
      if (invoice.orgPhone) { doc.text(invoice.orgPhone, P, detailY); detailY += 13; }
      if (invoice.orgAddress) { doc.text(invoice.orgAddress, P, detailY, { width: leftColW - 10 }); detailY += 13; }
      if (invoice.orgCountry) { doc.text(invoice.orgCountry, P, detailY); detailY += 13; }
      if (invoice.orgTaxId) {
        doc.font(FONT.regular).fontSize(7).fillColor(C.textLight);
        doc.text(`Tax ID: ${invoice.orgTaxId}`, P, detailY);
        detailY += 13;
      }

      const leftEndY = detailY;

      doc.font(FONT.bold).fontSize(7).fillColor(C.textMuted);
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
        doc.font(FONT.bold).fontSize(7).fillColor(C.textMuted);
        doc.text(label, rightColX, dY);
        doc.font(FONT.regular).fontSize(7.5).fillColor(C.textPrimary);
        // Truncate long period strings to avoid overlap
        const displayValue = value.length > 40 ? value.substring(0, 37) + "..." : value;
        doc.text(displayValue, rightColX + 72, dY, { width: CW - leftColW - 96 });
        dY += 14;
      }

      y = Math.max(leftEndY, dY) + 8;
      goldLine(doc, P, y, W - P, y, 0.6);
      y += 10;

      // ── PLAN DETAILS CARD ──
      // Dynamically calculate card height based on features
      let planCardH = 140;
      if (invoice.planFeatures && invoice.planFeatures.length > 0) {
        const perCol = Math.ceil(invoice.planFeatures.length / 2);
        planCardH = 48 + perCol * 13 + 52;
      }
      planCardH = Math.max(planCardH, 140);
      drawCardBright(doc, P, y, CW, planCardH);

      doc.font(FONT.bold).fontSize(14).fillColor(C.textPrimary);
      doc.text(`${invoice.planName.charAt(0).toUpperCase() + invoice.planName.slice(1)} Plan`, P + 16, y + 14);

      // ── CYCLE BADGE ──
      // Measure plan title width to avoid overlap
      doc.save();
      const planTitleText = `${invoice.planName.charAt(0).toUpperCase() + invoice.planName.slice(1)} Plan`;
      const planTitleWidth = doc.font(FONT.bold).fontSize(14).widthOfString(planTitleText);
      const cycleBadgeX = Math.max(P + planTitleWidth + 16, P + 200);
      doc.roundedRect(cycleBadgeX, y + 12, 55, 18, 4).fill(C.goldBg3);
      doc.roundedRect(cycleBadgeX, y + 12, 55, 18, 4).lineWidth(0.3).strokeColor(C.goldBorder).stroke();
      doc.font(FONT.bold).fontSize(7.5).fillColor(C.goldDim);
      doc.text(cycleLabel, cycleBadgeX, y + 17, { width: 55, align: "center" });
      doc.restore();

      let badgeX = cycleBadgeX + 62;
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
        doc.font(FONT.regular).fontSize(7).fillColor(C.textMuted);
        doc.text(String(lim), badgeX, y + 17, { width: bw, align: "center" });
        doc.restore();
        badgeX += bw + 5;
      }

      if (invoice.planFeatures && invoice.planFeatures.length > 0) {
        const featStartY = y + 40;
        doc.font(FONT.bold).fontSize(7).fillColor(C.textMuted);
        doc.text("PLAN FEATURES", P + 16, featStartY);
        const colW = (CW - 32) / 2;
        const perCol = Math.ceil(invoice.planFeatures.length / 2);
        for (let ci = 0; ci < 2; ci++) {
          let fy = featStartY + 14;
          const start = ci * perCol;
          const end = Math.min(start + perCol, invoice.planFeatures.length);
          for (let fi = start; fi < end; fi++) {
            const feature = invoice.planFeatures[fi];
            const fx = P + 16 + ci * colW;
            doc.circle(fx + 3, fy + 3.5, 1.5).fill(C.gold);
            doc.font(FONT.regular).fontSize(7.5).fillColor(C.textSecondary);
            // Truncate long feature names to avoid overlap
            const featText = feature.length > 32 ? feature.substring(0, 29) + "..." : feature;
            doc.text(featText, fx + 10, fy, { width: colW - 14 });
            fy += 13;
          }
        }
      }

      const payY = y + planCardH - 50;
      doc.save();
      doc.moveTo(P + 16, payY).lineTo(W - P - 16, payY).lineWidth(0.4).strokeColor(C.goldBorder).stroke();
      doc.restore();

      const payLabelX = P + 16;
      const payValueX = P + 130;

      if (invoice.paymentMethod) {
        const pmLabel = invoice.paymentMethod.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        doc.font(FONT.bold).fontSize(7.5).fillColor(C.textMuted);
        doc.text("Payment Method", payLabelX, payY + 8);
        doc.font(FONT.regular).fontSize(8).fillColor(C.textSecondary);
        doc.text(pmLabel, payValueX, payY + 8);
      }

      if (invoice.transactionId) {
        doc.font(FONT.bold).fontSize(7.5).fillColor(C.textMuted);
        doc.text("Transaction ID", payLabelX, payY + 22);
        doc.font(FONT.regular).fontSize(8).fillColor(C.textSecondary);
        doc.text(invoice.transactionId, payValueX, payY + 22);
      }

      // ── AMOUNT SECTION - Itemized Table ──
      const amtCardH = 100;
      const amtY = y + planCardH + 12;
      drawCardBright(doc, P, amtY, CW, amtCardH);

      // Table header row
      const tableLeft = P + 16;
      const tableRight = W - P - 16;
      const tableW = tableRight - tableLeft;
      const descColW = tableW * 0.42;
      const qtyColW = tableW * 0.12;
      const unitPriceColW = tableW * 0.23;
      const amtColW = tableW * 0.23;
      const col1X = tableLeft;
      const col2X = tableLeft + descColW;
      const col3X = col2X + qtyColW;
      const col4X = col3X + unitPriceColW;

      const headerY = amtY + 14;
      // Header background
      doc.save();
      doc.roundedRect(tableLeft, headerY - 2, tableW, 18, 3).fill(C.goldBg3);
      doc.restore();

      doc.font(FONT.bold).fontSize(7).fillColor(C.goldDim);
      doc.text("DESCRIPTION", col1X + 6, headerY + 2);
      doc.text("QTY", col2X + 4, headerY + 2);
      doc.text("UNIT PRICE", col3X + 4, headerY + 2);
      doc.text("AMOUNT", col4X + 4, headerY + 2);

      // Divider under header
      doc.save();
      doc.moveTo(tableLeft, headerY + 18).lineTo(tableRight, headerY + 18).lineWidth(0.3).strokeColor(C.goldBorder).stroke();
      doc.restore();

      // Data row
      const rowY = headerY + 24;
      const planLabel = `${invoice.planName.charAt(0).toUpperCase() + invoice.planName.slice(1)} Plan - ${cycleLabel} Subscription`;
      doc.font(FONT.regular).fontSize(8).fillColor(C.textPrimary);
      doc.text(planLabel, col1X + 6, rowY, { width: descColW - 10 });

      doc.font(FONT.regular).fontSize(8).fillColor(C.textSecondary);
      doc.text("1", col2X + 4, rowY);

      doc.font(FONT.regular).fontSize(8).fillColor(C.textSecondary);
      doc.text(formatCurrency(invoice.amount, invoice.currencySymbol), col3X + 4, rowY);

      doc.font(FONT.bold).fontSize(8).fillColor(C.textSecondary);
      doc.text(formatCurrency(invoice.amount, invoice.currencySymbol), col4X + 4, rowY);

      // Divider before total
      const totalDivY = rowY + 20;
      doc.save();
      doc.moveTo(tableLeft, totalDivY).lineTo(tableRight, totalDivY).lineWidth(0.5).strokeColor(C.goldBorder).stroke();
      doc.restore();

      // Total row
      doc.font(FONT.bold).fontSize(10).fillColor(C.textMuted);
      doc.text("Total Due", col1X + 6, totalDivY + 8);

      doc.font(FONT.bold).fontSize(18).fillColor(C.gold);
      doc.text(formatCurrency(invoice.amount, invoice.currencySymbol), col4X + 4, totalDivY + 5, { width: amtColW - 6, align: "right" });

      y = amtY + amtCardH + 10;

      // ── NOTES ──
      if (invoice.notes) {
        drawCard(doc, P, y, CW, 40);
        doc.font(FONT.bold).fontSize(7).fillColor(C.textMuted);
        doc.text("NOTES", P + 14, y + 8);
        doc.font(FONT.italic).fontSize(8).fillColor(C.textSecondary);
        doc.text(invoice.notes, P + 14, y + 20, { width: CW - 28 });
        y += 48;
      }

      // ── ACCEPTED PAYMENT METHODS ──
      // Safely parse paymentMethods (could be string or string[])
      let paymentMethods: string[] = [];
      if (invoice.platformPaymentMethods) {
        if (Array.isArray(invoice.platformPaymentMethods)) {
          paymentMethods = invoice.platformPaymentMethods;
        } else if (typeof invoice.platformPaymentMethods === "string") {
          try { paymentMethods = JSON.parse(invoice.platformPaymentMethods); } catch { paymentMethods = []; }
        }
      }
      if (paymentMethods.length > 0) {
        drawCard(doc, P, y, CW, 30);
        doc.font(FONT.bold).fontSize(7).fillColor(C.textMuted);
        doc.text("ACCEPTED PAYMENT METHODS", P + 14, y + 8);
        const pmText = paymentMethods
          .map((pm: string) => String(pm).replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()))
          .join("  •  ");
        doc.font(FONT.regular).fontSize(7.5).fillColor(C.textSecondary);
        doc.text(pmText, P + 14, y + 17, { width: CW - 28 });
        y += 38;
      }

      // ── FOOTER ──
      const footerY = H - 72;

      doc.save();
      const footerGrad = doc.linearGradient(P, 0, W - P, 0);
      footerGrad.stop(0, C.goldBg);
      footerGrad.stop(0.3, C.goldBorder);
      footerGrad.stop(0.7, C.goldBorder);
      footerGrad.stop(1, C.goldBg);
      doc.moveTo(P, footerY).lineTo(W - P, footerY).lineWidth(1).stroke(footerGrad);
      doc.restore();

      doc.font(FONT.italic).fontSize(9).fillColor(C.textSecondary);
      doc.text(`Thank you for choosing ${platformName}!`, P, footerY + 8, { width: CW, align: "center" });

      const footerParts: string[] = [];
      if (invoice.platformWebsite) footerParts.push(invoice.platformWebsite);
      if (invoice.platformEmail) footerParts.push(invoice.platformEmail);
      if (invoice.platformPhone) footerParts.push(invoice.platformPhone);
      if (invoice.platformWhatsapp) footerParts.push(`WhatsApp: ${invoice.platformWhatsapp}`);

      if (footerParts.length > 0) {
        doc.font(FONT.regular).fontSize(7).fillColor(C.textLight);
        doc.text(footerParts.join("   |   "), P, footerY + 22, { width: CW, align: "center" });
      }

      const socialParts: string[] = [];
      if (invoice.platformInstagram) socialParts.push(`Instagram: ${invoice.platformInstagram}`);
      if (invoice.platformFacebook) socialParts.push(`Facebook: ${invoice.platformFacebook}`);
      if (invoice.platformTwitter) socialParts.push(`Twitter: ${invoice.platformTwitter}`);

      if (socialParts.length > 0) {
        doc.font(FONT.regular).fontSize(6.5).fillColor(C.textLight);
        doc.text(socialParts.join("   |   "), P, footerY + 34, { width: CW, align: "center" });
      }

      if (invoice.platformSupportHours) {
        doc.font(FONT.regular).fontSize(6.5).fillColor(C.textLight);
        doc.text(`Support Hours: ${invoice.platformSupportHours}`, P, footerY + 44, { width: CW, align: "center" });
      }

      // Bottom gold bar
      doc.rect(0, H - 3, W, 3).fill(C.gold);

      // ── VALTRIOX WATERMARK - drawn LAST so it appears ON TOP of all content ──
      if (showWatermark) {
        doc.save();
        doc.opacity(0.06);
        doc.fontSize(52).fillColor(C.goldMid);
        doc.translate(W / 2, H / 2);
        doc.rotate(-35);
        doc.font(FONT.bold).text("VALTRIOX", -160, -40, { width: 320, align: "center" });
        doc.fontSize(14).fillColor(C.goldDim);
        doc.font(FONT.regular).text("POWERED BY VALTRIOX", -100, 20, { width: 200, align: "center" });
        doc.opacity(1);
        doc.restore();
      }

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
// PHASE 2: Generate Premium Custom Invoice PDF — Amber + Deep Navy theme
// Supports: line items, tax/discount, "PAID / VERIFIED" stamp, payment approval
// ============================================================================
export async function generateCustomInvoicePDF(invoice: InvoiceData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
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
    const approvedAt = safeDate(invoice.approvedAt);

    const W = 595.28;
    const H = 841.89;
    const P = 48;
    const CW = W - P * 2;

    const platformName = invoice.platformName || "Valtriox";
    const hasLogo = !!invoice.platformLogo;
    const isPaid = invoice.status === "paid" || invoice.status === "approved" || invoice.paymentStatus === "verified";
    const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    const hasLineItems = lineItems.length > 0;
    const subtotal = invoice.subtotal ?? (hasLineItems ? lineItems.reduce((s, li) => s + (li.amount || 0), 0) : invoice.amount);
    const taxAmount = invoice.taxAmount ?? 0;
    const discountAmount = invoice.discountAmount ?? 0;
    const total = invoice.amount;

    try {
      ensureFontsRegistered(doc);

      // ── NAVY HEADER BACKGROUND (full-bleed) ──
      doc.save();
      doc.rect(0, 0, W, 180).fill(C.charcoal);
      // Amber accent bar at bottom of charcoal header
      doc.rect(0, 178, W, 3).fill(C.gold);
      doc.restore();

      // Subtle amber watermark pattern in header (top-right amber dot grid)
      doc.save();
      doc.fillColor("#D4A73A");
      doc.opacity(0.08);
      for (let dx = 0; dx < 8; dx++) {
        for (let dy = 0; dy < 4; dy++) {
          doc.circle(W - P - dx * 14, 30 + dy * 14, 1.5).fill();
        }
      }
      doc.opacity(1);
      doc.restore();

      // ── LOGO + BRAND NAME (white text on charcoal) ──
      // Complete logo fills its aspect-matched frame edge-to-edge.
      let y = 36;
      let headerRightStartX = P + 60;

      drawBrandLogoFrame(doc, P, y, 48, {
        boxHeight: 48 * BRAND_LOGO_ASPECT,
        bgColor: "#FFFFFF", // white card so charcoal logo shows on dark header
        borderColor: C.gold,
        borderWidth: 1.4,
        padding: 0,
      });

      // Brand name (white)
      doc.font(FONT.bold).fontSize(22).fillColor("#ffffff");
      doc.text(platformName, headerRightStartX, y + 2);

      // Tagline (amber)
      doc.font(FONT.italic).fontSize(8.5).fillColor(C.gold);
      doc.text(invoice.platformTagline || "COMMAND YOUR BRAND UNIVERSE", headerRightStartX, y + 28);

      // ── RIGHT SIDE: INVOICE TITLE + NUMBER ──
      const rx = W - P;
      doc.font(FONT.bold).fontSize(28).fillColor("#ffffff");
      doc.text(invoice.invoiceTitle ? "INVOICE" : "INVOICE", P, y - 4, { width: CW, align: "right" });

      doc.font(FONT.regular).fontSize(9).fillColor("#cbd5e1");
      doc.text(invoice.invoiceNumber, P, y + 24, { width: CW, align: "right" });

      // Issue date + Due date (right side, smaller)
      doc.font(FONT.regular).fontSize(8).fillColor("#94a3b8");
      const dateLine = `Issued: ${formatDate(issuedAt)}   |   Due: ${formatDate(dueDate)}`;
      doc.text(dateLine, P, y + 38, { width: CW, align: "right" });

      // ── STATUS PILL (top-right corner of body, below header) ──
      let y2 = 200;
      const statusLabel = isPaid
        ? (invoice.paymentStatus === "verified" ? "✓ PAYMENT VERIFIED" : "PAID")
        : invoice.status === "sent" ? "SENT — AWAITING PAYMENT"
        : invoice.status === "pending" || invoice.paymentStatus === "pending_verification" ? "PAYMENT PENDING VERIFICATION"
        : invoice.status === "overdue" ? "OVERDUE"
        : invoice.status === "cancelled" ? "CANCELLED"
        : invoice.status === "refunded" ? "REFUNDED"
        : "DRAFT";

      const pillColor = isPaid ? C.green : (invoice.status === "overdue" || invoice.status === "cancelled" ? C.red : C.gold);
      const pillBg = isPaid ? C.greenBg : (invoice.status === "overdue" || invoice.status === "cancelled" ? C.redBg : C.goldBg);

      doc.save();
      const pillWidth = 220;
      const pillX = W - P - pillWidth;
      doc.roundedRect(pillX, y2, pillWidth, 26, 13).fill(pillBg);
      doc.roundedRect(pillX, y2, pillWidth, 26, 13).lineWidth(0.5).strokeColor(pillColor).stroke();
      doc.fillColor(pillColor).font(FONT.bold).fontSize(9);
      doc.text(statusLabel, pillX, y2 + 8, { width: pillWidth, align: "center" });
      doc.restore();

      // ── BILL TO + FROM SECTIONS ──
      y2 += 50;

      // Two columns: "BILLED TO" (left) and "FROM" (right)
      const colW = (CW - 24) / 2;
      const leftColX = P;
      const rightColX = P + colW + 24;

      // BILLED TO
      doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
      doc.text("BILLED TO", leftColX, y2, { width: colW });
      doc.font(FONT.bold).fontSize(13).fillColor(C.textPrimary);
      doc.text(invoice.clientName || invoice.orgName || "Client", leftColX, y2 + 14, { width: colW });
      doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
      let billedY = y2 + 34;
      const clientAddress = invoice.clientAddress || invoice.orgAddress;
      if (invoice.clientEmail || invoice.orgEmail) {
        doc.text(invoice.clientEmail || invoice.orgEmail!, leftColX, billedY, { width: colW });
        billedY += 12;
      }
      if (invoice.orgPhone) {
        doc.text(invoice.orgPhone, leftColX, billedY, { width: colW });
        billedY += 12;
      }
      if (clientAddress) {
        doc.text(clientAddress, leftColX, billedY, { width: colW, lineBreak: true });
        billedY += 22;
      }
      if (invoice.orgTaxId) {
        doc.font(FONT.regular).fontSize(8).fillColor(C.textLight);
        doc.text(`Tax ID: ${invoice.orgTaxId}`, leftColX, billedY, { width: colW });
      }

      // FROM
      doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
      doc.text("FROM", rightColX, y2, { width: colW });
      doc.font(FONT.bold).fontSize(13).fillColor(C.textPrimary);
      doc.text(platformName, rightColX, y2 + 14, { width: colW });
      doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
      let fromY = y2 + 34;
      if (invoice.platformEmail) { doc.text(invoice.platformEmail, rightColX, fromY, { width: colW }); fromY += 12; }
      if (invoice.platformPhone) { doc.text(invoice.platformPhone, rightColX, fromY, { width: colW }); fromY += 12; }
      if (invoice.platformAddress) { doc.text(invoice.platformAddress, rightColX, fromY, { width: colW, lineBreak: true }); fromY += 22; }
      if (invoice.platformWebsite) { doc.font(FONT.regular).fontSize(8).fillColor(C.textLight); doc.text(invoice.platformWebsite, rightColX, fromY, { width: colW }); }

      y2 = Math.max(billedY, fromY) + 28;

      // ── LINE ITEMS TABLE (or single-line plan card) ──
      if (hasLineItems) {
        // Table header (charcoal bar)
        doc.save();
        doc.rect(P, y2, CW, 28).fill(C.charcoal);
        doc.fillColor("#ffffff").font(FONT.bold).fontSize(8.5);
        doc.text("DESCRIPTION", P + 14, y2 + 10, { width: CW * 0.55 });
        doc.text("QTY", P + CW * 0.6, y2 + 10, { width: CW * 0.1, align: "right" });
        doc.text("RATE", P + CW * 0.72, y2 + 10, { width: CW * 0.14, align: "right" });
        doc.text("AMOUNT", P + CW * 0.86, y2 + 10, { width: CW * 0.14 - 14, align: "right" });
        doc.restore();

        y2 += 28;

        // Line item rows (alternating bg)
        lineItems.forEach((item, idx) => {
          const rowH = 36;
          if (idx % 2 === 0) {
            doc.save();
            doc.rect(P, y2, CW, rowH).fill(C.bg2);
            doc.restore();
          }
          doc.font(FONT.regular).fontSize(9.5).fillColor(C.textPrimary);
          const desc = item.description || "—";
          doc.text(desc, P + 14, y2 + 8, { width: CW * 0.55 - 14, lineBreak: true, ellipsis: true });
          doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
          doc.text(String(item.qty ?? 1), P + CW * 0.6, y2 + 12, { width: CW * 0.1, align: "right" });
          doc.text(formatCurrency(item.rate || 0, invoice.currencySymbol), P + CW * 0.72, y2 + 12, { width: CW * 0.14, align: "right" });
          doc.font(FONT.bold).fontSize(9.5).fillColor(C.textPrimary);
          doc.text(formatCurrency(item.amount || 0, invoice.currencySymbol), P + CW * 0.86, y2 + 12, { width: CW * 0.14 - 14, align: "right" });
          y2 += rowH;
        });

        // Table bottom border
        doc.save().moveTo(P, y2).lineTo(P + CW, y2).lineWidth(0.5).strokeColor(C.goldBorder).stroke().restore();
        y2 += 16;

        // ── TOTALS BLOCK (right-aligned) ──
        const totalsX = P + CW * 0.55;
        const totalsW = CW * 0.45;
        const labelX = totalsX;
        const valX = P + CW - 14;

        // Subtotal
        doc.font(FONT.regular).fontSize(9.5).fillColor(C.textSecondary);
        doc.text("Subtotal", labelX, y2, { width: totalsW * 0.55 });
        doc.text(formatCurrency(subtotal, invoice.currencySymbol), labelX + totalsW * 0.55, y2, { width: totalsW * 0.45, align: "right" });
        y2 += 18;

        // Discount
        if (discountAmount > 0) {
          doc.fillColor(C.green);
          doc.text("Discount", labelX, y2, { width: totalsW * 0.55 });
          doc.text(`− ${formatCurrency(discountAmount, invoice.currencySymbol)}`, labelX + totalsW * 0.55, y2, { width: totalsW * 0.45, align: "right" });
          y2 += 18;
        }

        // Tax
        if (invoice.taxRate && invoice.taxRate > 0) {
          doc.fillColor(C.textSecondary);
          doc.text(`Tax (${invoice.taxRate}%)`, labelX, y2, { width: totalsW * 0.55 });
          doc.text(formatCurrency(taxAmount, invoice.currencySymbol), labelX + totalsW * 0.55, y2, { width: totalsW * 0.45, align: "right" });
          y2 += 18;
        }

        // Total (amber bar)
        y2 += 4;
        doc.save();
        doc.rect(P + CW * 0.55 - 14, y2, totalsW + 14, 36).fill(C.goldBg3);
        doc.rect(P + CW * 0.55 - 14, y2, totalsW + 14, 36).lineWidth(0.8).strokeColor(C.gold).stroke();
        doc.restore();
        doc.font(FONT.bold).fontSize(10).fillColor(C.textPrimary);
        doc.text("TOTAL DUE", labelX, y2 + 12, { width: totalsW * 0.55 });
        doc.font(FONT.bold).fontSize(15).fillColor(C.charcoal);
        doc.text(formatCurrency(total, invoice.currencySymbol), labelX + totalsW * 0.55, y2 + 9, { width: totalsW * 0.45, align: "right" });
        y2 += 50;
      } else {
        // Single-line "Plan Card" style for subscription invoices
        doc.save();
        doc.roundedRect(P, y2, CW, 80, 8).fill(C.goldBg3);
        doc.roundedRect(P, y2, CW, 80, 8).lineWidth(0.5).strokeColor(C.goldBorder).stroke();
        doc.restore();
        doc.font(FONT.bold).fontSize(13).fillColor(C.textPrimary);
        doc.text(invoice.invoiceTitle || `${invoice.planName} Plan`, P + 18, y2 + 16, { width: CW - 36 });
        doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
        doc.text(invoice.billingCycle === "annually" ? "Annual Subscription" : "Monthly Subscription", P + 18, y2 + 36, { width: CW - 36 });
        doc.font(FONT.bold).fontSize(18).fillColor(C.charcoal);
        doc.text(formatCurrency(total, invoice.currencySymbol), P + 18, y2 + 52, { width: CW - 36, align: "right" });
        y2 += 100;
      }

      // ── PAYMENT INFO BOX (if paid) ──
      if (isPaid && (invoice.paymentMethod || invoice.transactionId)) {
        doc.save();
        doc.roundedRect(P, y2, CW, 60, 6).fill(C.greenBg);
        doc.roundedRect(P, y2, CW, 60, 6).lineWidth(0.5).strokeColor(C.green).stroke();
        doc.restore();
        doc.font(FONT.bold).fontSize(8).fillColor(C.green);
        doc.text("PAYMENT RECEIVED", P + 14, y2 + 10, { width: CW - 28 });
        doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
        if (invoice.paymentMethod) {
          doc.text(`Method: ${invoice.paymentMethod.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}`, P + 14, y2 + 26, { width: CW * 0.5 });
        }
        if (invoice.transactionId) {
          doc.text(`Transaction ID: ${invoice.transactionId}`, P + CW * 0.5, y2 + 26, { width: CW * 0.5 - 14 });
        }
        doc.font(FONT.regular).fontSize(8).fillColor(C.textMuted);
        doc.text(`Paid on: ${formatDate(paidAt || approvedAt)}`, P + 14, y2 + 42, { width: CW - 28 });
        y2 += 76;
      }

      // ── NOTES ──
      if (invoice.notes) {
        y2 += 8;
        doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
        doc.text("NOTES", P, y2, { width: CW });
        y2 += 14;
        doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
        const notesLines = doc.heightOfString(invoice.notes, { width: CW - 28 });
        doc.save();
        doc.roundedRect(P, y2 - 4, CW, notesLines + 16, 6).fill(C.bg2);
        doc.restore();
        doc.text(invoice.notes, P + 14, y2 + 4, { width: CW - 28 });
        y2 += notesLines + 22;
      }

      // ── "VERIFIED" STAMP (watermark-style, only when paid + approved) ──
      if (isPaid && invoice.paymentStatus === "verified") {
        doc.save();
        const stampX = W - P - 130;
        const stampY = Math.min(y2 + 40, H - 220);
        doc.translate(stampX, stampY);
        doc.rotate(-12);
        doc.roundedRect(0, 0, 130, 60, 6).lineWidth(2.5).strokeColor(C.green);
        doc.roundedRect(6, 6, 118, 48, 4).lineWidth(1).strokeColor(C.green);
        doc.fillColor(C.green).font(FONT.bold).fontSize(18);
        doc.text("VERIFIED", 0, 14, { width: 130, align: "center" });
        doc.font(FONT.regular).fontSize(7);
        doc.text("PAYMENT CONFIRMED", 0, 36, { width: 130, align: "center" });
        doc.restore();
      }

      // ── FOOTER (charcoal bar at bottom of page) ──
      const footerY = H - 80;
      doc.save();
      doc.rect(0, footerY, W, 80).fill(C.charcoal);
      doc.rect(0, footerY, W, 2).fill(C.gold);
      doc.restore();

      doc.fillColor("#ffffff").font(FONT.bold).fontSize(10);
      doc.text(`Thank you for choosing ${platformName}!`, P, footerY + 16, { width: CW, align: "center" });
      doc.font(FONT.regular).fontSize(8).fillColor("#cbd5e1");
      doc.text(invoice.platformTagline || "COMMAND YOUR BRAND UNIVERSE", P, footerY + 32, { width: CW, align: "center" });

      // Contact row
      const contactParts: string[] = [];
      if (invoice.platformWebsite) contactParts.push(invoice.platformWebsite);
      if (invoice.platformEmail) contactParts.push(invoice.platformEmail);
      if (invoice.platformPhone) contactParts.push(invoice.platformPhone);
      if (contactParts.length > 0) {
        doc.font(FONT.regular).fontSize(7.5).fillColor(C.gold);
        doc.text(contactParts.join("   |   "), P, footerY + 50, { width: CW, align: "center" });
      }

      doc.font(FONT.regular).fontSize(6.5).fillColor("#64748b");
      doc.text(`Invoice ${invoice.invoiceNumber}  ·  Generated ${formatDate(new Date())}  ·  ${platformName}`, P, footerY + 64, { width: CW, align: "center" });

    } catch (renderErr) {
      hasErrored = true;
      console.error("[PDF Custom Invoice] Render error:", renderErr);
      reject(new Error(`Custom invoice PDF render failed: ${renderErr instanceof Error ? renderErr.message : String(renderErr)}`));
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
// Generate SOFT LIGHT PREMIUM Report PDF - Light Background + Gold Accents
// ENHANCED: Cover page, Executive Summary with trends, Charts, Comparison, Page numbers
// ============================================================================

export async function generateReportPDF(report: ReportData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
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

    // ── SANITIZE ALL STRING INPUTS - prevent null.length errors in pdfkit ──
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
      // ── REGISTER FONTS FIRST (includes full validation of all 4 buffers) ──
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

      // ── CONFIDENTIAL watermark REMOVED from cover page ──
      // Phase 14 FIX: Previously a large diagonal "CONFIDENTIAL" text was drawn
      // at the page center (H/2 ≈ 421). The cover content (logo + org name +
      // title + subtitle + period badge + PLAN BADGE) grows downward from y=130
      // and the Plan badge frequently lands at y≈440-462 — DIRECTLY ON TOP of
      // the centered watermark. This caused visible text overlap that made the
      // document look broken.
      //
      // Instead, we now draw a SMALL "CONFIDENTIAL" pill at the bottom-right
      // of the cover page (above the gold bar) — same approach used by the
      // proposal generator. Security notice preserved, no overlap.

      // ── Cover content (centered vertically) ──

      // Decorative top line
      const topDecoY = 130;
      doc.save();
      const decoGrad = doc.linearGradient(W / 2 - 100, 0, W / 2 + 100, 0);
      decoGrad.stop(0, C.bg);
      decoGrad.stop(0.5, C.goldBorder);
      decoGrad.stop(1, C.bg);
      doc.moveTo(W / 2 - 100, topDecoY).lineTo(W / 2 + 100, topDecoY).lineWidth(0.8).stroke(decoGrad);
      doc.restore();

      // Diamond accent
      doc.save();
      doc.translate(W / 2, topDecoY);
      doc.rotate(Math.PI / 4);
      doc.rect(-4, -4, 8, 8).fill(accentColor);
      doc.restore();

      // ── LOGO (complete founder brand mark, aspect-matched golden frame) ──
      // The frame follows the embedded logo ratio so it fills edge-to-edge.
      let logoCenterY = topDecoY + 24;
      const coverLogoSize = 96;
      logoCenterY = drawBrandLogoFrameCentered(doc, W / 2, logoCenterY, coverLogoSize, {
        boxHeight: coverLogoSize * BRAND_LOGO_ASPECT,
        bgColor: C.goldBg2,
        borderColor: C.gold,
        borderWidth: 1.5,
        padding: 0,
      });
      logoCenterY += 24;

      // Organization name — use heightOfString for proper advance (no overlap)
      doc.font(FONT.regular).fontSize(14).fillColor(C.textMuted);
      const orgNameHeight = doc.heightOfString(safeOrgName, { width: CW, align: "center" });
      doc.text(safeOrgName, P, logoCenterY, { width: CW, align: "center" });
      logoCenterY += orgNameHeight + 16;

      // Report title (large, bold, gold) — use heightOfString to handle wrap
      doc.font(FONT.bold).fontSize(28).fillColor(C.gold);
      const titleHeight = doc.heightOfString(safeTitle, { width: CW, align: "center" });
      doc.text(safeTitle, P, logoCenterY, { width: CW, align: "center" });
      logoCenterY += titleHeight + 14;

      // Subtitle — use heightOfString
      if (safeSubtitle) {
        doc.font(FONT.italic).fontSize(12).fillColor(C.goldDim);
        const subHeight = doc.heightOfString(safeSubtitle, { width: CW, align: "center" });
        doc.text(safeSubtitle, P, logoCenterY, { width: CW, align: "center" });
        logoCenterY += subHeight + 18;
      }

      // Period badge
      const periodW = 220;
      const periodH = 30;
      doc.save();
      doc.roundedRect(W / 2 - periodW / 2, logoCenterY, periodW, periodH, 6).fill(C.goldBg2);
      doc.roundedRect(W / 2 - periodW / 2, logoCenterY, periodW, periodH, 6).lineWidth(0.5).strokeColor(C.goldBorder2).stroke();
      doc.font(FONT.regular).fontSize(10).fillColor(C.goldDim);
      doc.text(safePeriod, W / 2 - periodW / 2 + 8, logoCenterY + 9, { width: periodW - 16, align: "center" });
      doc.restore();
      logoCenterY += periodH + 14;

      // Plan badge (if exists)
      if (safePlan) {
        const planW = 140;
        const planH = 22;
        doc.save();
        doc.roundedRect(W / 2 - planW / 2, logoCenterY, planW, planH, 4).fill(C.goldBg);
        doc.roundedRect(W / 2 - planW / 2, logoCenterY, planW, planH, 4).lineWidth(0.3).strokeColor(C.goldBorder).stroke();
        doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
        doc.text(safePlan, W / 2 - planW / 2 + 4, logoCenterY + 7, { width: planW - 8, align: "center" });
        doc.restore();
        logoCenterY += planH + 14;
      }

      // Decorative bottom line
      doc.save();
      const decoGrad2 = doc.linearGradient(W / 2 - 100, 0, W / 2 + 100, 0);
      decoGrad2.stop(0, C.bg);
      decoGrad2.stop(0.5, C.goldBorder);
      decoGrad2.stop(1, C.bg);
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
      doc.font(FONT.regular).fontSize(8).fillColor(C.textLight);
      doc.text(`Generated on ${safeGeneratedAt}`, P, coverBottomY, { width: CW, align: "center" });
      doc.restore();

      if (safeTagline || safeOrgEmail) {
        doc.save();
        doc.font(FONT.italic).fontSize(8).fillColor(C.textLight);
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
        doc.font(FONT.regular).fontSize(7).fillColor(C.textLight);
        doc.text(coverContactParts.join("   |   "), P, coverBottomY + 32, { width: CW, align: "center" });
        doc.restore();
      }

      // ── Small CONFIDENTIAL pill (bottom-right of cover, above gold bar) ──
      // Replaces the old diagonal watermark that overlapped with the Plan badge.
      // Same visual pattern used by proposal-generator.ts.
      //
      // Phase 15 FIX: Previously drawn as two separate roundedRect() calls
      // (one .fill(), one .lineWidth().strokeColor() with NO .stroke()).
      // pdfkit left the second path dangling (no explicit fill/stroke op),
      // and the NEXT fill operation (the green bottom bar) would silently
      // fill the dangling pill path with the bottom-bar's color — making
      // the pill appear GREEN (#059669 when org brandColor is green) instead
      // of the intended cream (#FDF8E8). The CONFIDENTIAL text was then
      // invisible (gold-on-green).
      //
      // FIX: Draw the pill ONCE using .fillAndStroke(color, strokeColor)
      // which emits a single 'B' operator (fill + stroke) in the PDF stream.
      // No dangling path, no color bleed.
      const confPillW = 110;
      const confPillH = 22;
      const confPillX = W - P - confPillW;
      const confPillY = H - 18 - confPillH;
      doc.save();
      doc.lineWidth(0.5);
      doc.roundedRect(confPillX, confPillY, confPillW, confPillH, 4)
         .fillAndStroke(C.goldBg3, C.goldBorder);
      // Use charcoal text on cream background for maximum contrast (always
      // readable regardless of org brandColor).
      doc.font(FONT.bold).fontSize(8).fillColor(C.charcoal);
      doc.text("CONFIDENTIAL", confPillX, confPillY + 7, { width: confPillW, align: "center" });
      doc.restore();

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
        gradient.stop(0, C.goldBg3, 0.15);
        gradient.stop(1, C.bg, 1);
        doc.rect(0, 0, W, 120).fill(gradient);
        doc.rect(0, 0, W, 3).fill(accentColor);
      }

      drawContentPageBg();

      let tableY = P + 6;

      // ── CONTENT HEADER ──
      // Complete logo fills its aspect-matched frame edge-to-edge.
      let contentLogoRightX = P;
      drawBrandLogoFrame(doc, P, tableY, 32, {
        boxHeight: 32 * BRAND_LOGO_ASPECT,
        bgColor: C.goldBg2,
        borderColor: C.gold,
        borderWidth: 0.8,
        padding: 0,
      });
      contentLogoRightX = P + 40;

      doc.font(FONT.bold).fontSize(14).fillColor(C.gold);
      doc.text(safeTitle, contentLogoRightX, tableY + 2);

      doc.font(FONT.italic).fontSize(8).fillColor(C.textLight);
      doc.text(safeSubtitle || "Business Analytics Report", contentLogoRightX, tableY + 20);

      // Period badge (top right)
      doc.save();
      doc.roundedRect(W - P - 160, tableY + 4, 160, 18, 4).fill(C.goldBg);
      doc.roundedRect(W - P - 160, tableY + 4, 160, 18, 4).lineWidth(0.3).strokeColor(C.goldBorder).stroke();
      doc.font(FONT.regular).fontSize(7.5).fillColor(C.textMuted);
      doc.text(safePeriod, W - P - 155, tableY + 9, { width: 150, align: "center" });
      doc.restore();

      goldLine(doc, P, tableY + 36, W - P, tableY + 36, 0.6);

      doc.font(FONT.regular).fontSize(8).fillColor(C.textSecondary);
      let orgInfo = `Prepared for: ${safeOrgName}`;
      if (safeOrgEmail) orgInfo += `  |  ${safeOrgEmail}`;
      doc.text(orgInfo, P, tableY + 42, { width: CW });

      doc.font(FONT.regular).fontSize(7).fillColor(C.textLight);
      doc.text(`Generated: ${safeGeneratedAt}`, P, tableY + 54);

      goldLine(doc, P, tableY + 66, W - P, tableY + 66, 0.4);

      tableY = tableY + 76;

      // ── EMPTY STATE CHECK ──
      if (isDataEmpty) {
        drawEmptyState(doc, P, tableY, CW, W, H);
        // Still add page numbers at the end (below)
      } else {
        // ── EXECUTIVE SUMMARY: KPI CARDS WITH TREND ARROWS ──
        doc.font(FONT.bold).fontSize(12).fillColor(C.gold);
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
            doc.font(FONT.bold).fontSize(6.5).fillColor(C.textMuted);
            doc.text(String(stat.label || "").toUpperCase(), cx + 10, tableY + 8, { width: cardW2 - 20 });

            // Value
            doc.font(FONT.bold).fontSize(18).fillColor(C.textPrimary);
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

          doc.font(FONT.bold).fontSize(12).fillColor(C.gold);
          const trendTitle = safeTitle.includes("Sales") ? "Revenue Trend Over Time"
            : safeTitle.includes("Customer") ? "Customer Growth Trend"
            : safeTitle.includes("Product") ? "Sales Volume Trend"
            : "Trend Overview";
          doc.text(trendTitle, P, tableY);
          tableY += 18;

          drawVerticalBarChart(doc, P, tableY, CW, 200, report.trendChartData, "", FONT.regular);
          tableY += 210;
        }

        // Horizontal Bar Chart (top items)
        if (report.barChartData && report.barChartData.length > 0) {
          const barChartH = Math.min(report.barChartData.length * 26 + 40, 320);
          tableY = ensureSpace(doc, tableY, barChartH + 30, W, H, P);

          doc.font(FONT.bold).fontSize(12).fillColor(C.gold);
          const barTitle = safeTitle.includes("Sales") ? "Top 5 Products by Revenue"
            : safeTitle.includes("Customer") ? "Top 10 Customers by Spend"
            : safeTitle.includes("Product") ? "Top 10 Products by Revenue"
            : "Top Performing Items";
          doc.text(barTitle, P, tableY);
          tableY += 18;

          drawHorizontalBarChart(doc, P, tableY, CW, barChartH, report.barChartData, "", FONT.regular);
          tableY += barChartH + 16;
        }

        // Pie / Donut Chart (distribution)
        if (report.pieChartData && report.pieChartData.length > 0) {
          tableY = ensureSpace(doc, tableY, 260, W, H, P);

          doc.font(FONT.bold).fontSize(12).fillColor(C.gold);
          const pieTitle = safeTitle.includes("Sales") ? "Order Status Distribution"
            : safeTitle.includes("Customer") ? "Customer Tier Distribution"
            : safeTitle.includes("Product") ? "Stock Status Distribution"
            : "Category Distribution";
          doc.text(pieTitle, P, tableY);
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

          doc.font(FONT.bold).fontSize(12).fillColor(C.gold);
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
            doc.font(FONT.bold).fontSize(7).fillColor(C.textMuted);
            doc.text(header.toUpperCase(), colX, tableY + 10, { width: colWidths[i] - 16 });
            colX += colWidths[i];
          });

          // Header divider
          doc.save();
          doc.moveTo(P + 8, tableY + 24).lineTo(W - P - 8, tableY + 24).lineWidth(0.4).strokeColor(C.goldBorder).stroke();
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
                // Change column - special formatting
                const change = cell as number;
                const isPositive = change >= 0;
                const arrow = isPositive ? "▲" : "▼";
                const color = isPositive ? C.green : C.red;
                const changeText = `${arrow} ${Math.abs(change).toFixed(1)}%`;

                doc.font(FONT.bold).fontSize(8).fillColor(color);
                doc.text(changeText, colX, ry + 3, { width: colWidths[ci] - 16 });
              } else {
                doc.font(FONT.regular).fontSize(8).fillColor(C.textSecondary);
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

          doc.font(FONT.bold).fontSize(11).fillColor(C.gold);
          doc.text(String(table.title || "Data Table"), P, tableY);
          tableY += 18;

          drawCard(doc, P, tableY, CW, tblH, 6);

          const safeHeaders = table.headers.filter(h => h != null);
          const colW = safeHeaders.length > 0 ? CW / safeHeaders.length : CW;
          safeHeaders.forEach((header, i) => {
            doc.font(FONT.bold).fontSize(7).fillColor(C.textMuted);
            doc.text(String(header).toUpperCase(), P + 10 + i * colW, tableY + 9, { width: colW - 20 });
          });

          doc.save();
          doc.moveTo(P + 8, tableY + 22).lineTo(W - P - 8, tableY + 22).lineWidth(0.4).strokeColor(C.goldBorder).stroke();
          doc.restore();

          if (rowCount === 0) {
            doc.font(FONT.italic).fontSize(9).fillColor(C.textMuted);
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
                doc.font(FONT.regular).fontSize(8).fillColor(C.textSecondary);
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
          doc.font(FONT.bold).fontSize(7).fillColor(C.textMuted);
          doc.text("SUMMARY", P + 14, tableY + 8);
          doc.font(FONT.regular).fontSize(8).fillColor(C.textSecondary);
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
        fGrad.stop(0, C.goldBg);
        fGrad.stop(0.5, C.goldBorder);
        fGrad.stop(1, C.goldBg);
        doc.moveTo(P, H - 50).lineTo(W - P, H - 50).lineWidth(0.5).stroke(fGrad);
        doc.restore();

        // Powered by
        doc.save();
        doc.font(FONT.italic).fontSize(7).fillColor(C.textLight);
        doc.text(`Powered by ${platformName} - COMMAND YOUR BRAND UNIVERSE`, P, H - 44, { width: CW, align: "center" });
        doc.restore();

        // Page number: "Page X of Y"
        doc.save();
        doc.font(FONT.regular).fontSize(7).fillColor(C.textLight);
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
            doc.font(FONT.regular).fontSize(6.5).fillColor(C.textLight);
            doc.text(footerParts.join("   |   "), P, H - 26, { width: CW, align: "center" });
            doc.restore();
          }
        }

        // NOTE: Content-page CONFIDENTIAL watermark removed — it was drawn
        // ON TOP of all content at 72pt and was being perceived as "content
        // overlap" by users. The cover page retains a single subtle watermark.
      }

    } catch (renderErr: unknown) {
      hasErrored = true;
      const errMsg = renderErr instanceof Error ? renderErr.message : String(renderErr);
      const errStack = renderErr instanceof Error ? renderErr.stack : 'N/A';
      console.error("[PDF Report] Render error:", errMsg);
      console.error("[PDF Report] Stack:", errStack);
      reject(new Error(`Report PDF render failed: ${errMsg}\n[Stack] ${errStack}`));
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
// Cover Page Logo Helper - Renders a larger centered logo for the cover page
// ============================================================================

function renderCoverDefaultLogo(doc: PDFKit.PDFDocument, centerX: number, y: number, size: number, color: string): void {
  doc.save();
  doc.roundedRect(centerX - size / 2 - 4, y - 4, size + 8, size + 8, 10).fill(C.goldBg2);
  doc.roundedRect(centerX - size / 2 - 4, y - 4, size + 8, size + 8, 10).lineWidth(0.5).strokeColor(C.goldBorder2).stroke();
  doc.roundedRect(centerX - size / 2, y, size, size, 8).fill(color);
  doc.fontSize(size * 0.35).fillColor("#ffffff");
  doc.font(FONT.bold).text("VTX", centerX - size / 2, y + size * 0.3, { width: size, align: "center" });
  doc.restore();
}

// ============================================================================
// Vertical Logo Helper - Renders the bundled vertical Valtriox logo
// ============================================================================
//
// The logo file (valtriox-logo-vertical.png, 508x733 RGBA) is bundled in
// /public so it's available on Vercel serverless. We load it once and cache
// the buffer for the lifetime of the function instance.
//
// This is the actual VERTICAL logo (taller than wide, 508x733 — aspect ratio
// 1.443:1). The previous "valtriox-logo-vertical-inverted.png" was actually
// HORIZONTAL (1209x999) and is no longer used here.
//
// BRANDING RULES (per founder's spec):
//   - Light PDF theme (current cream/white): render logo on top of a colored
//     background card (goldBg2 + goldBorder2) so the transparent logo has a
//     visible frame. This is the "logo with background" variant.
//   - Dark PDF theme: render logo with NO background card (transparent bg).
//     To enable dark mode, pass `theme: 'dark'` to renderVerticalLogo.
//
// Returns the height consumed (for layout advancement).

let _verticalLogoBuffer: Buffer | null | undefined;
async function getVerticalLogoBuffer(): Promise<Buffer | null> {
  if (_verticalLogoBuffer !== undefined) return _verticalLogoBuffer;
  try {
    const fs = await import("fs");
    const path = await import("path");
    // Use the ACTUAL vertical logo (508x733, transparent background)
    const logoPath = path.join(process.cwd(), "public", "valtriox-logo-vertical.png");
    if (fs.existsSync(logoPath)) {
      _verticalLogoBuffer = fs.readFileSync(logoPath);
    } else {
      _verticalLogoBuffer = null;
    }
  } catch {
    _verticalLogoBuffer = null;
  }
  return _verticalLogoBuffer;
}

/**
 * Render the vertical Valtriox logo on the cover page, centered horizontally.
 * @param doc PDFKit document
 * @param centerX X coordinate of the logo center
 * @param y Top Y coordinate where the logo starts
 * @param targetWidth Desired width in points (height auto-scales to preserve aspect ratio)
 * @param theme 'light' (default) renders a colored background card behind the
 *              transparent logo; 'dark' renders the logo with no background.
 * @returns The Y position just below the logo (for layout advancement)
 */
async function renderVerticalLogo(
  doc: PDFKit.PDFDocument,
  centerX: number,
  y: number,
  targetWidth: number,
  theme: "light" | "dark" = "light"
): Promise<number> {
  const buffer = await getVerticalLogoBuffer();
  if (!buffer) {
    // Fallback to VTX box if logo file isn't available
    renderCoverDefaultLogo(doc, centerX, y, 60, C.gold);
    return y + 68;
  }
  try {
    // Source logo is 508 x 733 (aspect ratio ~1.443:1, taller than wide — VERTICAL)
    // Compute height to preserve aspect ratio
    const aspectRatio = 733 / 508; // height / width
    const targetHeight = targetWidth * aspectRatio;
    const x = centerX - targetWidth / 2;
    doc.save();
    if (theme === "light") {
      // Light theme: render a colored background card behind the transparent logo
      // (the "logo with background" variant per founder's branding spec)
      const pad = 14;
      const cardW = targetWidth + pad * 2;
      const cardH = targetHeight + pad * 2;
      // Outer card with subtle gold background
      doc.roundedRect(x - pad, y - pad, cardW, cardH, 16).fill(C.goldBg2);
      doc.roundedRect(x - pad, y - pad, cardW, cardH, 16).lineWidth(0.8).strokeColor(C.goldBorder2).stroke();
      // Inner subtle gradient overlay for depth
      const innerGrad = doc.linearGradient(x - pad, y - pad, x - pad, y + targetHeight + pad);
      innerGrad.stop(0, C.goldBg3, 0.4);
      innerGrad.stop(1, C.goldBg2, 0);
      doc.roundedRect(x - pad, y - pad, cardW, cardH, 16).fill(innerGrad);
    }
    // For dark theme, no background card — logo renders directly on dark bg
    // Draw the logo image
    doc.image(buffer, x, y, { width: targetWidth, height: targetHeight });
    doc.restore();
    return y + targetHeight;
  } catch {
    renderCoverDefaultLogo(doc, centerX, y, 60, C.gold);
    return y + 68;
  }
}

// ============================================================================
// Empty State Drawing Helper
// ============================================================================

function drawEmptyState(doc: PDFKit.PDFDocument, x: number, y: number, w: number, _W: number, _H: number): void {
  const centerY = y + 120;

  // Icon placeholder - large gold circle with "!" inside
  doc.save();
  doc.circle(x + w / 2, centerY - 20, 36).lineWidth(1.5).strokeColor(C.goldBorder).stroke();
  doc.circle(x + w / 2, centerY - 20, 36).fill(C.goldBg);
  doc.font(FONT.bold).fontSize(28).fillColor(C.textMuted);
  doc.text("!", x + w / 2 - 6, centerY - 35);
  doc.restore();

  // Main message
  doc.save();
  doc.font(FONT.bold).fontSize(14).fillColor(C.textPrimary);
  doc.text("No Data Available", x, centerY + 30, { width: w, align: "center" });
  doc.restore();

  // Subtitle
  doc.save();
  doc.font(FONT.regular).fontSize(10).fillColor(C.textMuted);
  doc.text("There is no data available for this reporting period.", x, centerY + 54, { width: w, align: "center" });
  doc.restore();

  // Hint
  doc.save();
  doc.font(FONT.italic).fontSize(8).fillColor(C.textLight);
  doc.text("Data will appear here once transactions or activity are recorded.", x, centerY + 76, { width: w, align: "center" });
  doc.restore();
}
