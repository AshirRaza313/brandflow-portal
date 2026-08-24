// @ts-nocheck — Phase 8: pre-existing TS errors (Decimal/Prisma types, etc.) pending migration
// ============================================================================
// Lead Magnet PDF Generator - Dynamic from PlatformSettings
// Uses pdfkit with EMBEDDED TTF fonts (base64 in font-buffers.ts)
// Serverless-safe - no filesystem dependency for fonts
// SOFT LIGHT PREMIUM Theme - Clean whites, warm creams, dark text hierarchy
// ============================================================================

import PDFDocument from "pdfkit";
import { FONT_REGULAR, FONT_BOLD, FONT_ITALIC, FONT_BOLD_ITALIC } from "./font-buffers";
import { getBrandLogoBuffer, BRAND_LOGO_ASPECT } from "./brand-logo";

// ── Font Registration ──

const FONT = {
  regular: "LiberationSans",
  bold: "LiberationSans-Bold",
  italic: "LiberationSans-Italic",
  boldItalic: "LiberationSans-BoldItalic",
};

function ensureFontsRegistered(doc: any): void {
  const fonts = [
    { name: FONT.regular, buf: FONT_REGULAR, label: "REGULAR" },
    { name: FONT.bold, buf: FONT_BOLD, label: "BOLD" },
    { name: FONT.italic, buf: FONT_ITALIC, label: "ITALIC" },
    { name: FONT.boldItalic, buf: FONT_BOLD_ITALIC, label: "BOLD_ITALIC" },
  ];
  for (const f of fonts) {
    if (!f.buf || typeof f.buf.length !== "number" || f.buf.length === 0) continue;
    try {
      doc.registerFont(f.name, f.buf);
    } catch (fontErr: any) {
      if (f.label === "REGULAR" || f.label === "BOLD") {
        throw new Error(`Critical font ${f.label} failed: ${fontErr?.message || String(fontErr)}`);
      }
      try {
        doc.registerFont(f.name, f.label === "ITALIC" ? FONT_REGULAR : FONT_BOLD);
      } catch {}
    }
  }
}

// ── Types ──

export interface LeadMagnetSettings {
  companyName: string;
  tagline: string;
  logoUrl?: string | null; // base64 data URI or null
  companyEmail: string;
  companyPhone?: string | null;
  companyWebsite?: string | null;
  companyAddress?: string | null;
  whatsappNumber?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  discordUrl?: string | null;
  redditUrl?: string | null;
  youtubeUrl?: string | null;
  tiktokUrl?: string | null;
  socialLinksVisible?: boolean;
  showInstagram?: boolean;
  showFacebook?: boolean;
  showTwitter?: boolean;
  showLinkedin?: boolean;
  showDiscord?: boolean;
  showReddit?: boolean;
  showYoutube?: boolean;
  showTiktok?: boolean;
  showWhatsApp?: boolean;
  supportHours?: string;
  primaryBrandColor?: string;
  documentDate?: Date;
}

const DEFAULT_GUIDE_TAGLINE = "Invite-only beta for selected brand-operation workflows";

function formatContactNumber(value?: string | null): string {
  const original = (value || "").trim();
  const digits = original.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("92")) {
    return `+92 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `+92 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  return original;
}

function formatSupportHours(value?: string | null): string {
  const normalized = (value || "").replace(/\s+/g, " ").trim();

  if (/^Mon-Fri:\s*9AM-6PM\s*PKT$/i.test(normalized)) {
    return "Monday–Friday, 9:00 AM–6:00 PM PKT";
  }

  return normalized;
}

// ── Colors - Valtriox Brand 2026 (Charcoal / Modern Gold / White) ──

const C = {
  bg: "#FAFAFA",            // White (per brand spec)
  bg2: "#F4F4F5",
  bg3: "#EFEFEF",
  gold: "#D4A73A",          // Primary Gold (Modern Gold)
  goldBright: "#B8942F",    // Dark Gold
  goldMid: "#E8BD58",       // Light Gold
  goldDim: "#A58829",
  goldBg: "#FFFEFB",
  goldBg2: "#FEFCF5",
  goldBg3: "#FDF8E8",
  goldBorder: "#E8DCC8",
  goldBorder2: "#D4C5A0",
  darkPremium: "#161B26",   // Charcoal (primary dark)
  charcoal: "#161B26",
  deepNavy: "#10151E",
  slate800: "#1E293B",
  amberGlow: "#D4A73A",
  lightSurface: "#F5F0E8",
  textPrimary: "#161B26",   // Charcoal — primary text
  textSecondary: "#334155",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  green: "#059669",
  greenBg: "#ECFDF5",
  slate200: "#E2E8F0",
};

// ── Brand Logo Helpers (complete founder logo, aspect-matched golden frame) ──
// Per founder directive, this logo is the SOLE brand mark on every PDF.

interface BrandLogoOptions {
  boxHeight?: number;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  padding?: number;
}

function drawBrandLogoFrame(
  doc: any,
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
  doc.rect(x, y, boxSize, boxHeight).fill(bgColor);
  doc.rect(x, y, boxSize, boxHeight).lineWidth(borderWidth).strokeColor(borderColor).stroke();

  if (buffer) {
    try {
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
    } catch {}
  } else {
    doc.fontSize(boxSize * 0.35).fillColor("#ffffff");
    doc.font(FONT.bold).text("VTX", x, y + boxHeight * 0.3, { width: boxSize, align: "center" });
  }
  doc.restore();
  return boxSize;
}

function drawBrandLogoFrameCentered(
  doc: any,
  centerX: number,
  y: number,
  boxSize: number,
  opts?: BrandLogoOptions,
): number {
  const x = centerX - boxSize / 2;
  drawBrandLogoFrame(doc, x, y, boxSize, opts);
  return y + (opts?.boxHeight ?? boxSize);
}

// ── Helpers ──

function parseBase64DataUri(dataUri: string): { mimeType: string; base64: string } | null {
  if (!dataUri) return null;
  const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

function goldLine(doc: any, x1: number, y1: number, x2: number, y2: number, width = 0.5) {
  doc.save().moveTo(x1, y1).lineTo(x2, y2).lineWidth(width).strokeColor(C.goldBorder).stroke().restore();
}

function drawCard(doc: any, x: number, y: number, w: number, h: number, radius = 8) {
  doc.save();
  doc.roundedRect(x, y, w, h, radius).fill(C.goldBg);
  doc.roundedRect(x, y, w, h, radius).lineWidth(0.5).strokeColor(C.goldBorder).stroke();
  doc.restore();
}

function drawCardBright(doc: any, x: number, y: number, w: number, h: number, radius = 8) {
  doc.save();
  doc.roundedRect(x, y, w, h, radius).fill(C.goldBg2);
  doc.roundedRect(x, y, w, h, radius).lineWidth(0.8).strokeColor(C.goldBorder2).stroke();
  doc.restore();
}

function drawSectionHeader(doc: any, y: number, title: string, subtitle?: string, W: number, P: number): number {
  const CW = W - P * 2;
  // Gold accent bar on left
  doc.save();
  doc.roundedRect(P, y, 4, 22, 2).fill(C.gold);
  doc.restore();

  // Title
  doc.font(FONT.bold).fontSize(20).fillColor(C.textPrimary);
  doc.text(title, P + 14, y + 2);

  // Subtitle
  let newY = y + 28;
  if (subtitle) {
    doc.font(FONT.italic).fontSize(10).fillColor(C.textMuted);
    doc.text(subtitle, P + 14, newY);
    newY += 20;
  }

  // Divider
  goldLine(doc, P, newY + 4, W - P, newY + 4, 0.6);
  return newY + 16;
}

function drawFeatureItem(doc: any, x: number, y: number, w: number, icon: string, title: string, description: string): number {
  // Icon circle
  doc.save();
  doc.circle(x + 16, y + 16, 14).fill(C.goldBg3);
  doc.circle(x + 16, y + 16, 14).lineWidth(0.5).strokeColor(C.goldBorder).stroke();
  doc.font(FONT.bold).fontSize(12).fillColor(C.gold);
  doc.text(icon, x + 16 - 6, y + 16 - 6, { width: 12, align: "center" });
  doc.restore();

  // Title
  doc.font(FONT.bold).fontSize(10).fillColor(C.textPrimary);
  doc.text(title, x + 38, y + 4, { width: w - 42 });

  // Description - wrap text
  doc.font(FONT.regular).fontSize(8).fillColor(C.textSecondary);
  const textH = doc.heightOfString(description, { width: w - 42 });
  doc.text(description, x + 38, y + 18, { width: w - 42 });

  return Math.max(textH + 22, 40);
}

function ensureSpace(doc: any, y: number, needed: number, W: number, H: number, P: number): number {
  if (y + needed > H - 80) {
    doc.addPage();
    doc.rect(0, 0, W, H).fill(C.lightSurface);
    doc.rect(0, 0, W, 3).fill(C.gold);
    return P + 10;
  }
  return y;
}

// ── Page background helper ──
function addPageBg(doc: any, W: number, H: number) {
  doc.rect(0, 0, W, H).fill(C.lightSurface);
  doc.rect(0, 0, W, 3).fill(C.gold);
}

// ── Page footer ──
function addPageFooter(doc: any, settings: LeadMagnetSettings, W: number, H: number, pageNum: number) {
  const footerY = H - 42;

  doc.save();
  const grad = doc.linearGradient(44, 0, W - 44, 0);
  grad.stop(0, C.goldBg);
  grad.stop(0.3, C.goldBorder);
  grad.stop(0.7, C.goldBorder);
  grad.stop(1, C.goldBg);
  doc.moveTo(44, footerY).lineTo(W - 44, footerY).lineWidth(0.8).stroke(grad);
  doc.restore();

  doc.font(FONT.regular).fontSize(7).fillColor(C.textLight);
  const leftParts: string[] = [];
  if (settings.companyEmail) leftParts.push(settings.companyEmail);
  if (settings.companyPhone) leftParts.push(formatContactNumber(settings.companyPhone));
  if (settings.companyWebsite) leftParts.push(settings.companyWebsite);
  doc.text(leftParts.join("  |  "), 44, footerY + 8, { width: W - 88 });

  doc.font(FONT.italic).fontSize(7).fillColor(C.textLight);
  doc.text(`${settings.companyName} | Invite-Only Beta Guide`, 44, footerY + 20, { width: W / 2 - 44 });

  doc.font(FONT.regular).fontSize(7).fillColor(C.textLight);
  doc.text(`Page ${pageNum}`, W - 44, footerY + 20, { width: 40, align: "right" });

  doc.rect(0, H - 3, W, 3).fill(C.gold);
}

// ============================================================================
// MAIN: Generate Lead Magnet PDF
// ============================================================================

export async function generateLeadMagnetPDF(settings: LeadMagnetSettings): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    let hasErrored = false;
    const buffers: Buffer[] = [];
    const documentDate = settings.documentDate || new Date();
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      bufferPages: true,
      autoFirstPage: true,
      info: {
        CreationDate: documentDate,
        ModDate: documentDate,
      },
    });

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => { if (!hasErrored) resolve(Buffer.concat(buffers)); });
    doc.on("error", (err) => { hasErrored = true; reject(err); });

    const W = 595.28;
    const H = 841.89;
    const P = 50;
    const CW = W - P * 2;

    const companyName = settings.companyName || "Valtriox";
    // Public guide positioning is reviewed in source. A database-managed
    // tagline is intentionally not injected because it could reintroduce
    // unsupported marketing claims without code review.
    const tagline = DEFAULT_GUIDE_TAGLINE;
    doc.info.Title = `${companyName} Invite-Only Beta Introduction Guide`;
    doc.info.Subject = "Reviewed overview of selected beta workflows; availability depends on plan, role, and configuration.";

    let pageNum = 0;

    try {
      ensureFontsRegistered(doc);

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 1: COVER PAGE
      // ══════════════════════════════════════════════════════════════════════
      pageNum++;
      addPageBg(doc, W, H);

      // Gradient overlay on top half - Premium Gold Gradient
      doc.save();
      const coverGrad = doc.linearGradient(0, 0, W, H * 0.6);
      coverGrad.stop(0, C.goldBg3);
      coverGrad.stop(0.3, C.goldBg2);
      coverGrad.stop(0.7, C.gold);
      coverGrad.stop(1, C.lightSurface);
      doc.rect(0, 0, W, H * 0.6).fill(coverGrad);
      doc.restore();

      // Complete founder logo in an aspect-matched golden frame.
      drawBrandLogoFrameCentered(doc, W / 2, 120, 80, {
        boxHeight: 80 * BRAND_LOGO_ASPECT,
        bgColor: C.goldBg,
        borderColor: C.gold,
        borderWidth: 1.2,
        padding: 0,
      });

      // Company name
      doc.font(FONT.bold).fontSize(36).fillColor(C.textPrimary);
      doc.text(companyName, P, 230, { width: CW, align: "center" });

      // Tagline
      doc.font(FONT.italic).fontSize(14).fillColor(C.goldDim);
      doc.text(tagline, P, 280, { width: CW, align: "center" });

      // Document title
      doc.font(FONT.bold).fontSize(24).fillColor(C.gold);
      doc.text("Introduction Guide", P, 340, { width: CW, align: "center" });

      // Subtitle
      doc.font(FONT.regular).fontSize(11).fillColor(C.textMuted);
      doc.text("A beta overview of selected modules and workflows,", P, 380, { width: CW, align: "center" });
      doc.text("with availability confirmed by plan, role, and configuration.", P, 396, { width: CW, align: "center" });

      // Gold divider
      goldLine(doc, W / 2 - 80, 440, W / 2 + 80, 440, 1);

      // Date
      const currentDate = documentDate.toLocaleDateString("en-US", { year: "numeric", month: "long", timeZone: "UTC" });
      doc.font(FONT.regular).fontSize(9).fillColor(C.textLight);
      doc.text(currentDate, P, 460, { width: CW, align: "center" });

      // Public document badge
      doc.save();
      doc.lineWidth(0.5);
      doc.roundedRect(W / 2 - 60, 500, 120, 26, 6).fillAndStroke(C.goldBg3, C.goldBorder);
      doc.font(FONT.bold).fontSize(8).fillColor(C.charcoal);
      doc.text("INVITE-ONLY BETA", W / 2 - 60, 508, { width: 120, align: "center" });
      doc.restore();

      addPageFooter(doc, settings, W, H, pageNum);

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 2: TABLE OF CONTENTS
      // ══════════════════════════════════════════════════════════════════════
      pageNum++;
      doc.addPage();
      addPageBg(doc, W, H);

      let y = P + 10;
      y = drawSectionHeader(doc, y, "Table of Contents", "Navigate to the sections that interest you most", W, P);
      y += 8;

      const tocItems = [
        { num: "01", title: "What is " + companyName + "?", desc: "An overview of the invite-only beta and its current direction" },
        { num: "02", title: "Selected Beta Modules", desc: "Examples available by plan, role, and configuration" },
        { num: "03", title: "Benefits for Your Brand", desc: "Practical ways the platform can support your operations" },
        { num: "04", title: "How Beta Access Works", desc: "A conditional onboarding path for approved participants" },
        { num: "05", title: "Overview of Key Modules", desc: "A concise view of the main operational areas" },
        { num: "06", title: "What to Expect", desc: "A flexible onboarding journey shaped by your scope" },
        { num: "07", title: "Contact Information", desc: "Get in touch with our team" },
      ];

      for (const item of tocItems) {
        // Card row
        drawCard(doc, P, y, CW, 50);

        // Number badge
        doc.save();
        doc.roundedRect(P + 12, y + 13, 28, 24, 5).fill(C.goldBg3);
        doc.roundedRect(P + 12, y + 13, 28, 24, 5).lineWidth(0.5).strokeColor(C.goldBorder).stroke();
        doc.font(FONT.bold).fontSize(11).fillColor(C.gold);
        doc.text(item.num, P + 12, y + 20, { width: 28, align: "center" });
        doc.restore();

        // Title
        doc.font(FONT.bold).fontSize(11).fillColor(C.textPrimary);
        doc.text(item.title, P + 50, y + 10, { width: CW - 60 });

        // Description
        doc.font(FONT.regular).fontSize(8).fillColor(C.textMuted);
        doc.text(item.desc, P + 50, y + 26, { width: CW - 60 });

        y += 58;
      }

      addPageFooter(doc, settings, W, H, pageNum);

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 3: WHAT IS VALTRIOX?
      // ══════════════════════════════════════════════════════════════════════
      pageNum++;
      doc.addPage();
      addPageBg(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, `What is ${companyName}?`, "An overview of the invite-only beta and its current direction", W, P);

      // Main description card
      drawCardBright(doc, P, y, CW, 120);
      doc.font(FONT.regular).fontSize(10).fillColor(C.textSecondary);
      doc.text(
        `${companyName} is an invite-only beta workspace for selected order, product, customer, marketing, team, reporting, and operational workflows. Available modules, limits, connectors, and support depend on the participant's plan, role, and approved beta configuration.`,
        P + 18, y + 16, { width: CW - 36, lineGap: 4 }
      );
      doc.font(FONT.italic).fontSize(9).fillColor(C.goldDim);
      doc.text(
        `"${tagline}"`,
        P + 18, y + 80, { width: CW - 36, align: "center" }
      );
      y += 136;

      // Verified capability pillars (no unsupported usage or performance statistics)
      y = ensureSpace(doc, y, 100, W, H, P);
      const stats = [
        { label: "Operations", value: "Selected" },
        { label: "Access", value: "Role-Aware" },
        { label: "Reporting", value: "Available" },
        { label: "Workflows", value: "Configurable" },
      ];

      drawCard(doc, P, y, CW, 80);
      const statW = CW / 4;
      stats.forEach((stat, i) => {
        const sx = P + i * statW;
        doc.font(FONT.bold).fontSize(14).fillColor(C.gold);
        doc.text(stat.value, sx, y + 14, { width: statW, align: "center" });
        doc.font(FONT.regular).fontSize(8).fillColor(C.textMuted);
        doc.text(stat.label, sx, y + 46, { width: statW, align: "center" });
        if (i < 3) {
          doc.save();
          doc.moveTo(sx + statW, y + 14).lineTo(sx + statW, y + 66).lineWidth(0.3).strokeColor(C.goldBorder).stroke();
          doc.restore();
        }
      });
      y += 96;

      // Platform positioning
      y = ensureSpace(doc, y, 80, W, H, P);
      drawCard(doc, P, y, CW, 74);
      doc.font(FONT.bold).fontSize(10).fillColor(C.textPrimary);
      doc.text("Current Beta Scope", P + 18, y + 12, { width: CW - 36 });
      doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
      doc.text(
        `${companyName} is testing selected operational workflows in one workspace. Participation does not guarantee every listed module; availability is confirmed for each organization and can change as the beta is validated.`,
        P + 18, y + 30, { width: CW - 36, lineGap: 3 }
      );

      addPageFooter(doc, settings, W, H, pageNum);

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 4: SELECTED BETA MODULES
      // ══════════════════════════════════════════════════════════════════════
      pageNum++;
      doc.addPage();
      addPageBg(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, "Selected Beta Modules", "Examples only; availability depends on plan, role, and configuration", W, P);
      y += 4;

      const features = [
        { icon: "O", title: "Order Management", desc: "Track orders through configurable statuses, priority levels, notes, invoices, returns, and fulfillment workflows from one workspace." },
        { icon: "P", title: "Product & Inventory", desc: "Organize products, categories, variants, pricing rules, stock alerts, reviews, and catalog records." },
        { icon: "T", title: "Team & Access", desc: "Manage members, roles, permissions, attendance, payroll records, tasks, and team conversations." },
        { icon: "M", title: "Marketing Workflows", desc: "Plan campaigns, email content, social activity, influencers, coupons, loyalty programs, and promotional sales." },
        { icon: "A", title: "Analytics & Reports", desc: "Review revenue, sales, product, and customer reporting to understand performance and operational trends." },
        { icon: "C", title: "Customer Management", desc: "Maintain customer profiles, purchase history, segments, notes, loyalty activity, and communication records." },
        { icon: "D", title: "Billing & Documents", desc: "Manage plans, payment approvals, invoices, proposals, and branded PDF documents in one coordinated workflow." },
        { icon: "W", title: "Operations Hub", desc: "Coordinate returns, shipping, packaging, suppliers, warehouse records, support tickets, follow-ups, and SLA tracking." },
      ];

      for (const feature of features) {
        y = ensureSpace(doc, y, 50, W, H, P);
        const itemH = drawFeatureItem(doc, P, y, CW, feature.icon, feature.title, feature.desc);
        y += itemH + 10;
      }

      addPageFooter(doc, settings, W, H, pageNum);

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 5: BENEFITS FOR YOUR BRAND
      // ══════════════════════════════════════════════════════════════════════
      pageNum++;
      doc.addPage();
      addPageBg(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, "Benefits for Your Brand", "Practical ways " + companyName + " can support your operations", W, P);
      y += 4;

      const benefits = [
        { title: "Centralize Daily Operations", desc: "Bring orders, products, customers, marketing, team coordination, and operational records into one shared workspace." },
        { title: "Reduce Repetitive Work", desc: "Configurable rules, templates, and bulk actions can simplify recurring tasks and reduce duplicated effort." },
        { title: "Improve Operational Visibility", desc: "Dashboards and reports help teams review activity, spot trends, and make informed decisions with clearer context." },
        { title: "Support Clear Team Ownership", desc: "Roles, permissions, tasks, and activity records help each team member understand their responsibilities." },
        { title: "Strengthen Customer Follow-Up", desc: "Customer profiles, history, segments, notes, and loyalty records keep useful context together." },
        { title: "Grow with Configurable Workflows", desc: "Enable relevant modules and adapt permissions and processes as operational needs change." },
      ];

      for (const benefit of benefits) {
        y = ensureSpace(doc, y, 56, W, H, P);
        drawCard(doc, P, y, CW, 50);

        // Green vector check (avoids font-dependent missing glyphs)
        doc.save();
        doc.circle(P + 18, y + 25, 10).fill(C.greenBg);
        doc.circle(P + 18, y + 25, 10).lineWidth(0.5).strokeColor(C.green).stroke();
        doc.moveTo(P + 13, y + 25).lineTo(P + 17, y + 29).lineTo(P + 24, y + 21);
        doc.lineWidth(1.8).lineCap("round").lineJoin("round").strokeColor(C.green).stroke();
        doc.restore();

        doc.font(FONT.bold).fontSize(10).fillColor(C.textPrimary);
        doc.text(benefit.title, P + 38, y + 8, { width: CW - 50 });
        doc.font(FONT.regular).fontSize(8).fillColor(C.textSecondary);
        doc.text(benefit.desc, P + 38, y + 24, { width: CW - 50, lineGap: 2 });

        y += 58;
      }

      addPageFooter(doc, settings, W, H, pageNum);

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 6: HOW IT WORKS
      // ══════════════════════════════════════════════════════════════════════
      pageNum++;
      doc.addPage();
      addPageBg(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, "How It Works", "Getting started in four simple steps", W, P);
      y += 4;

      const steps = [
        {
          num: "1",
          title: "Request Beta Access",
          desc: `Use the contact form to share the workflows you want to test. The team reviews requests during published business hours; access and follow-up timing are not guaranteed.`,
        },
        {
          num: "2",
          title: "Conditional Beta Walkthrough",
          desc: `If availability and the current beta scope fit, review selected ${companyName} modules and discuss which workflows may be configured for your team.`,
        },
        {
          num: "3",
          title: "Recommended Setup Plan",
          desc: `Following the review, the proposed scope can outline relevant modules, configuration priorities, pricing, and an implementation timeline based on your requirements.`,
        },
        {
          num: "4",
          title: "Configure, Review & Activate",
          desc: `After approval, the agreed settings, permissions, and available workflows can be configured for review. Activation and support remain subject to the confirmed beta plan.`,
        },
      ];

      for (const step of steps) {
        y = ensureSpace(doc, y, 80, W, H, P);

        // Step number + connector line
        doc.save();
        doc.roundedRect(P + 12, y + 4, 36, 36, 10).fill(C.gold);
        doc.font(FONT.bold).fontSize(18).fillColor("#ffffff");
        doc.text(step.num, P + 12, y + 14, { width: 36, align: "center" });
        doc.restore();

        doc.font(FONT.bold).fontSize(12).fillColor(C.textPrimary);
        doc.text(step.title, P + 60, y + 8, { width: CW - 68 });

        doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
        const descH = doc.heightOfString(step.desc, { width: CW - 68, lineGap: 3 });
        doc.text(step.desc, P + 60, y + 26, { width: CW - 68, lineGap: 3 });

        y += Math.max(descH + 38, 60) + 12;
      }

      addPageFooter(doc, settings, W, H, pageNum);

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 7: PLATFORM MODULES
      // ══════════════════════════════════════════════════════════════════════
      pageNum++;
      doc.addPage();
      addPageBg(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, "Overview of Key Modules", "A concise view of the main operational areas", W, P);
      y += 4;

      const modules = [
        { name: "Dashboard", desc: "KPI cards, revenue charts, daily summaries, activity, and quick actions." },
        { name: "Orders", desc: "Statuses, priorities, bulk actions, invoices, fulfillment, and returns." },
        { name: "Products & Catalog", desc: "Products, categories, variants, pricing rules, alerts, and reviews." },
        { name: "Customers", desc: "Profiles, history, segments, notes, loyalty activity, and communication records." },
        { name: "Marketing", desc: "Campaigns, email, social activity, influencers, coupons, and promotional sales." },
        { name: "Team & Access", desc: "Members, roles, permissions, attendance, payroll records, tasks, and chat." },
        { name: "Finance & Documents", desc: "Plans, approvals, invoices, expenses, proposals, and reports." },
        { name: "Operations", desc: "Returns, warehouse, shipping, packaging, suppliers, tickets, and SLA tracking." },
        { name: "Analytics & Reports", desc: "Revenue, sales, customer, and product reporting." },
        { name: "Events", desc: "Event records, themes, schedules, settings, and promotional workflows." },
      ];

      // Two column layout
      const colW = (CW - 16) / 2;

      for (let i = 0; i < modules.length; i += 2) {
        y = ensureSpace(doc, y, 56, W, H, P);

        for (let col = 0; col < 2; col++) {
          const mod = modules[i + col];
          if (!mod) break;

          const mx = P + col * (colW + 16);
          drawCard(doc, mx, y, colW, 50);

          // Module name
          doc.font(FONT.bold).fontSize(10).fillColor(C.gold);
          doc.text(mod.name, mx + 14, y + 10, { width: colW - 28 });

          // Description
          doc.font(FONT.regular).fontSize(7.5).fillColor(C.textSecondary);
          doc.text(mod.desc, mx + 14, y + 26, { width: colW - 28, lineGap: 2 });
        }

        y += 60;
      }

      addPageFooter(doc, settings, W, H, pageNum);

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 8: WHAT TO EXPECT
      // ══════════════════════════════════════════════════════════════════════
      pageNum++;
      doc.addPage();
      addPageBg(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, "What to Expect", "A flexible onboarding journey shaped by your scope", W, P);
      y += 4;

      // Timeline card
      drawCardBright(doc, P, y, CW, 276);

      const timeline = [
        { phase: "Discovery", title: "Goals & Priorities", desc: "Review your current processes, team structure, and the modules most relevant to your operations." },
        { phase: "Configuration", title: "Workspace Setup", desc: "Configure agreed settings, branding, modules, and workflows around the approved scope." },
        { phase: "Team Setup", title: "Access & Guidance", desc: "Create team access, apply roles and permissions, and introduce the workflows each role will use." },
        { phase: "Review", title: "Workflow Check & Activation", desc: "Review the configured beta experience and confirm whether the approved scope is ready for activation." },
        { phase: "Ongoing", title: "Support & Improvement", desc: "Continue refining the workspace as business needs, processes, and available features evolve." },
      ];

      let ty = y + 16;
      for (const item of timeline) {
        // Phase badge
        doc.save();
        const badgeW = doc.font(FONT.bold).fontSize(8).widthOfString(item.phase) + 16;
        doc.roundedRect(P + 18, ty, badgeW, 20, 4).fill(C.goldBg3);
        doc.roundedRect(P + 18, ty, badgeW, 20, 4).lineWidth(0.5).strokeColor(C.goldBorder).stroke();
        doc.font(FONT.bold).fontSize(8).fillColor(C.goldDim);
        doc.text(item.phase, P + 18, ty + 6, { width: badgeW, align: "center" });
        doc.restore();

        // Title
        doc.font(FONT.bold).fontSize(10).fillColor(C.textPrimary);
        doc.text(item.title, P + badgeW + 30, ty + 2, { width: CW - badgeW - 48 });

        // Description
        doc.font(FONT.regular).fontSize(8.5).fillColor(C.textSecondary);
        doc.text(item.desc, P + badgeW + 30, ty + 16, { width: CW - badgeW - 48, lineGap: 2 });

        ty += 45;
      }

      doc.font(FONT.italic).fontSize(7.5).fillColor(C.textMuted);
      doc.text(
        "Timelines vary based on scope, integrations, data readiness, and configuration requirements.",
        P + 18,
        y + 250,
        { width: CW - 36, align: "center" },
      );

      y += 292;

      // Expectation highlights
      y = ensureSpace(doc, y, 116, W, H, P);
      drawCard(doc, P, y, CW, 100);
      doc.font(FONT.bold).fontSize(11).fillColor(C.textPrimary);
      doc.text("What Approved Participants Can Expect", P + 18, y + 14, { width: CW - 36 });

      const diffs = [
        "A setup plan based on agreed priorities and requirements",
        "Role-aware access configured for the people using the workspace",
        "A workflow review before any agreed activation point",
        "Support and adjustments only within the confirmed beta plan",
      ];
      let diffY = y + 34;
      for (const diff of diffs) {
        doc.font(FONT.regular).fontSize(8.5).fillColor(C.textSecondary);
        doc.circle(P + 26, diffY + 4, 2.5).fill(C.gold);
        doc.text(diff, P + 36, diffY - 2, { width: CW - 54 });
        diffY += 15;
      }

      addPageFooter(doc, settings, W, H, pageNum);

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 9: CONTACT INFORMATION (DYNAMIC FROM ADMIN SETTINGS)
      // ══════════════════════════════════════════════════════════════════════
      pageNum++;
      doc.addPage();
      addPageBg(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, "Contact Information", "We would love to hear from you", W, P);
      y += 4;

      const contactItems = [
        { label: "EMAIL", value: settings.companyEmail || "N/A", color: C.gold },
        { label: "PHONE", value: formatContactNumber(settings.companyPhone), color: C.textPrimary },
        { label: "WHATSAPP", value: settings.socialLinksVisible !== false && settings.showWhatsApp ? formatContactNumber(settings.whatsappNumber) : "", color: C.green },
        { label: "WEBSITE", value: settings.companyWebsite || "", color: C.gold },
        { label: "SUPPORT HOURS", value: formatSupportHours(settings.supportHours), color: C.textSecondary },
      ].filter((item) => item.value);

      const contactRows = Math.ceil(contactItems.length / 2);
      const contactCardH = 20 + contactRows * 54;
      const contactColW = CW / 2;
      drawCardBright(doc, P, y, CW, contactCardH);

      contactItems.forEach((item, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const cx = P + col * contactColW + 20;
        const cy = y + 16 + row * 54;

        doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
        doc.text(item.label, cx, cy, { width: contactColW - 40 });
        doc.font(FONT.regular).fontSize(10).fillColor(item.color);
        doc.text(item.value, cx, cy + 13, { width: contactColW - 40, lineGap: 1 });
      });

      y += contactCardH + 16;

      // Social media section
      const socialLinks = settings.socialLinksVisible !== false ? [
        { label: "Instagram", url: settings.instagramUrl, visible: settings.showInstagram },
        { label: "Facebook", url: settings.facebookUrl, visible: settings.showFacebook },
        { label: "X / Twitter", url: settings.twitterUrl, visible: settings.showTwitter },
        { label: "LinkedIn", url: settings.linkedinUrl, visible: settings.showLinkedin },
        { label: "Discord", url: settings.discordUrl, visible: settings.showDiscord },
        { label: "Reddit", url: settings.redditUrl, visible: settings.showReddit },
        { label: "YouTube", url: settings.youtubeUrl, visible: settings.showYoutube },
        { label: "TikTok", url: settings.tiktokUrl, visible: settings.showTiktok },
      ].filter((social) => social.visible && social.url) : [];

      if (socialLinks.length > 0) {
        const socialRows = Math.ceil(socialLinks.length / 4);
        const socialCardH = 38 + socialRows * 32;
        y = ensureSpace(doc, y, socialCardH + 12, W, H, P);
        drawCard(doc, P, y, CW, socialCardH);

        doc.font(FONT.bold).fontSize(9).fillColor(C.textPrimary);
        doc.text("Follow Us on Social Media", P + 18, y + 10, { width: CW - 36 });

        const sy = y + 30;
        const socialColW = (CW - 36) / 4;

        for (let i = 0; i < socialLinks.length; i++) {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const sx = P + 18 + col * socialColW;
          const sRowY = sy + row * 32;

          doc.font(FONT.bold).fontSize(8).fillColor(C.gold);
          doc.text(socialLinks[i].label, sx, sRowY);
          doc.font(FONT.regular).fontSize(7.5).fillColor(C.goldDim);
          doc.text("Visit profile", sx, sRowY + 12, {
            width: socialColW - 4,
            link: socialLinks[i].url!,
            underline: true,
          });
        }

        y += socialCardH + 12;
      }

      // CTA at bottom
      const ctaY = H - 130;
      doc.save();
      doc.roundedRect(W / 2 - 140, ctaY, 280, 44, 10).fill(C.gold);
      doc.font(FONT.bold).fontSize(12).fillColor("#ffffff");
      doc.text("Interested in the Invite-Only Beta?", W / 2 - 140, ctaY + 10, { width: 280, align: "center" });
      doc.font(FONT.regular).fontSize(9).fillColor("#ffffff");
      doc.text(settings.companyWebsite || "Visit the website to request access", W / 2 - 140, ctaY + 28, { width: 280, align: "center" });
      doc.restore();

      addPageFooter(doc, settings, W, H, pageNum);

      // ── END ──
      doc.end();

    } catch (err) {
      hasErrored = true;
      reject(err);
    }
  });
}
