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
  supportHours?: string;
  primaryBrandColor?: string;
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
  if (settings.companyPhone) leftParts.push(settings.companyPhone);
  if (settings.companyWebsite) leftParts.push(settings.companyWebsite);
  doc.text(leftParts.join("  |  "), 44, footerY + 8, { width: W - 88 });

  doc.font(FONT.italic).fontSize(7).fillColor(C.textLight);
  doc.text(`${settings.companyName} | Confidential`, 44, footerY + 20, { width: W / 2 - 44 });

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
    const P = 50;
    const CW = W - P * 2;

    const companyName = settings.companyName || "Valtriox";
    const tagline = settings.tagline || "COMMAND YOUR BRAND UNIVERSE";
    const brandColor = settings.primaryBrandColor || C.gold;

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
      doc.text("Everything you need to know about our platform,", P, 380, { width: CW, align: "center" });
      doc.text("what it does, and how it can help your brand grow.", P, 396, { width: CW, align: "center" });

      // Gold divider
      goldLine(doc, W / 2 - 80, 440, W / 2 + 80, 440, 1);

      // Date
      const currentDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" });
      doc.font(FONT.regular).fontSize(9).fillColor(C.textLight);
      doc.text(currentDate, P, 460, { width: CW, align: "center" });

      // Confidential badge
      doc.save();
      doc.lineWidth(0.5);
      doc.roundedRect(W / 2 - 50, 500, 100, 26, 6).fillAndStroke(C.goldBg3, C.goldBorder);
      doc.font(FONT.bold).fontSize(8).fillColor(C.charcoal);
      doc.text("CONFIDENTIAL", W / 2 - 50, 508, { width: 100, align: "center" });
      doc.restore();

      // Contact info at bottom
      let contactY = H - 110;
      const contactParts: string[] = [];
      if (settings.companyEmail) contactParts.push(settings.companyEmail);
      if (settings.companyPhone) contactParts.push(settings.companyPhone);
      if (settings.companyWebsite) contactParts.push(settings.companyWebsite);
      if (contactParts.length > 0) {
        doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
        doc.text(contactParts.join("  |  "), P, contactY, { width: CW, align: "center" });
        contactY += 16;
      }

      // Social links
      const socialParts: string[] = [];
      if (settings.instagramUrl) socialParts.push("Instagram");
      if (settings.facebookUrl) socialParts.push("Facebook");
      if (settings.linkedinUrl) socialParts.push("LinkedIn");
      if (settings.twitterUrl) socialParts.push("X / Twitter");
      if (settings.discordUrl) socialParts.push("Discord");
      if (settings.redditUrl) socialParts.push("Reddit");
      if (socialParts.length > 0) {
        doc.font(FONT.regular).fontSize(8).fillColor(C.textLight);
        doc.text(socialParts.join("   |   "), P, contactY, { width: CW, align: "center" });
      }

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
        { num: "01", title: "What is " + companyName + "?", desc: "An overview of the platform and its mission" },
        { num: "02", title: "Core Features", desc: "The key capabilities that power your brand operations" },
        { num: "03", title: "Benefits for Your Brand", desc: "How the platform transforms your business" },
        { num: "04", title: "How It Works", desc: "Getting started in simple steps" },
        { num: "05", title: "Platform Modules", desc: "Detailed breakdown of each operational module" },
        { num: "06", title: "What to Expect", desc: "Your onboarding journey with us" },
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
      y = drawSectionHeader(doc, y, `What is ${companyName}?`, "An overview of the platform and its mission", W, P);

      // Main description card
      drawCardBright(doc, P, y, CW, 120);
      doc.font(FONT.regular).fontSize(10).fillColor(C.textSecondary);
      doc.text(
        `${companyName} is a comprehensive, all-in-one brand management platform designed to help businesses streamline their operations from a single, powerful dashboard. Whether you are running an e-commerce store, managing a multi-brand portfolio, or scaling your team, ${companyName} provides the tools you need to command every aspect of your brand.`,
        P + 18, y + 16, { width: CW - 36, lineGap: 4 }
      );
      doc.font(FONT.italic).fontSize(9).fillColor(C.goldDim);
      doc.text(
        `"${tagline}"`,
        P + 18, y + 80, { width: CW - 36, align: "center" }
      );
      y += 136;

      // Key stats
      y = ensureSpace(doc, y, 100, W, H, P);
      const stats = [
        { label: "Orders Managed", value: "100K+" },
        { label: "Active Brands", value: "200+" },
        { label: "Team Members", value: "5,000+" },
        { label: "Uptime", value: "99.9%" },
      ];

      drawCard(doc, P, y, CW, 80);
      const statW = CW / 4;
      stats.forEach((stat, i) => {
        const sx = P + i * statW;
        doc.font(FONT.bold).fontSize(22).fillColor(C.gold);
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

      // Built for Pakistani brands
      y = ensureSpace(doc, y, 80, W, H, P);
      drawCard(doc, P, y, CW, 60);
      doc.font(FONT.bold).fontSize(10).fillColor(C.textPrimary);
      doc.text("Built in Pakistan, for Pakistani Brands", P + 18, y + 12, { width: CW - 36 });
      doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
      doc.text(
        `${companyName} is proudly developed with the unique needs of Pakistani businesses in mind. From local payment integrations to regional market insights, every feature is designed to help local brands compete and grow in the digital economy.`,
        P + 18, y + 30, { width: CW - 36, lineGap: 3 }
      );

      addPageFooter(doc, settings, W, H, pageNum);

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 4: CORE FEATURES
      // ══════════════════════════════════════════════════════════════════════
      pageNum++;
      doc.addPage();
      addPageBg(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, "Core Features", "The key capabilities that power your brand operations", W, P);
      y += 4;

      const features = [
        { icon: "O", title: "Order Management", desc: "Track, manage, and fulfill orders with real-time status updates, auto-status rules, priority tagging, and comprehensive order lifecycle management." },
        { icon: "P", title: "Product & Inventory", desc: "Manage your entire product catalog with variants, pricing rules, stock alerts, reviews, and multi-warehouse inventory tracking." },
        { icon: "T", title: "Team Collaboration", desc: "Built-in team chat, attendance tracking, payroll management, task assignments, and role-based access control for your entire organization." },
        { icon: "M", title: "Marketing Hub", desc: "Launch campaigns across social media, manage influencers, run flash sales, track SEO performance, and automate email marketing." },
        { icon: "A", title: "Advanced Analytics", desc: "Comprehensive dashboards with revenue charts, traffic analytics, customer reports, product performance tracking, and sales forecasting." },
        { icon: "C", title: "Customer Management", desc: "360-degree customer profiles with purchase history, loyalty programs, WhatsApp integration, and automated follow-up sequences." },
        { icon: "S", title: "Subscription Billing", desc: "Automated recurring billing, payment approvals, invoice generation, plan management, and multi-currency support." },
        { icon: "W", title: "Warehouse & Shipping", desc: "Multi-warehouse management, packaging optimization, shipping label generation, supplier management, and SLA tracking." },
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
      y = drawSectionHeader(doc, y, "Benefits for Your Brand", "How " + companyName + " transforms your business", W, P);
      y += 4;

      const benefits = [
        { title: "Save 15+ Hours Per Week", desc: "Automate repetitive tasks like order processing, inventory tracking, and team coordination. Our platform eliminates manual work so you can focus on growing your brand." },
        { title: "Increase Revenue by 30%", desc: "With built-in analytics, marketing automation, and customer retention tools, our clients typically see a significant boost in revenue within the first 3 months of onboarding." },
        { title: "Reduce Errors by 90%", desc: "Automated status rules, inventory syncing, and order management workflows dramatically reduce human errors that cost your business time and money." },
        { title: "Scale Without Limits", desc: "Whether you have 5 orders or 50,000, " + companyName + " scales with you. Our infrastructure handles growth seamlessly without performance degradation." },
        { title: "Make Data-Driven Decisions", desc: "Comprehensive dashboards and reporting tools give you real-time visibility into every aspect of your business, empowering you to make informed decisions quickly." },
        { title: "Enhance Customer Experience", desc: "Loyalty programs, WhatsApp integration, personalized follow-ups, and 360-degree customer profiles help you deliver exceptional experiences at scale." },
      ];

      for (const benefit of benefits) {
        y = ensureSpace(doc, y, 56, W, H, P);
        drawCard(doc, P, y, CW, 50);

        // Green check
        doc.save();
        doc.circle(P + 18, y + 25, 10).fill(C.greenBg);
        doc.circle(P + 18, y + 25, 10).lineWidth(0.5).strokeColor(C.green).stroke();
        doc.font(FONT.bold).fontSize(12).fillColor(C.green);
        doc.text("✓", P + 18 - 4, y + 25 - 6, { width: 8, align: "center" });
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
          title: "Schedule Your Free Consultation",
          desc: `Fill out our contact form with your preferred consultation method (video call, phone call, or in-person meeting), select your availability, and pick a convenient date and time slot. Our team will confirm your consultation within 24 hours.`,
        },
        {
          num: "2",
          title: "Personalized Demo & Strategy Session",
          desc: `During your consultation, we will conduct a personalized demo of ${companyName} tailored to your specific industry and business needs. We will analyze your current operations and identify key areas for improvement.`,
        },
        {
          num: "3",
          title: "Custom Proposal & Implementation Plan",
          desc: `Based on the consultation, we will prepare a detailed proposal with a customized implementation plan, clear pricing, and timeline. You will receive a professional proposal document outlining the complete scope of work.`,
        },
        {
          num: "4",
          title: "Onboard Your Team & Launch",
          desc: `Once approved, our dedicated onboarding specialist will set up your account, configure workflows, and train your team. You will be up and running with ${companyName} within weeks, with ongoing support every step of the way.`,
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
      y = drawSectionHeader(doc, y, "Platform Modules", "Detailed breakdown of each operational module", W, P);
      y += 4;

      const modules = [
        { name: "Dashboard", desc: "Real-time overview with KPI cards, revenue charts, daily summary, activity feed, and quick actions." },
        { name: "Orders", desc: "Full order lifecycle management with auto-status, priority levels, bulk actions, and invoice generation." },
        { name: "Products & Catalog", desc: "Product management with variants, pricing rules, stock alerts, reviews, and catalog organization." },
        { name: "Customers", desc: "Customer profiles, loyalty programs, WhatsApp integration, and automated engagement tracking." },
        { name: "Marketing", desc: "Campaign management, influencer tracking, flash sales, SEO tools, social media, and email marketing." },
        { name: "Team", desc: "Attendance, payroll, task management, team chat, and role-based access control." },
        { name: "Finance", desc: "Subscription billing, payment approvals, invoices, expense tracking, and financial reports." },
        { name: "Operations", desc: "Warehouse management, shipping, packaging, supplier tracking, tickets, and SLA engine." },
        { name: "Analytics", desc: "Revenue analytics, traffic analytics, customer reports, product reports, and sales reports." },
        { name: "Events", desc: "Event management with regional themes, ticket sales, and promotional event creation." },
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
      y = drawSectionHeader(doc, y, "What to Expect", "Your onboarding journey with us", W, P);
      y += 4;

      // Timeline card
      drawCardBright(doc, P, y, CW, 260);

      const timeline = [
        { phase: "Week 1", title: "Discovery & Setup", desc: "We learn about your brand, configure your platform, and set up core modules based on your requirements." },
        { phase: "Week 2", title: "Team Onboarding", desc: "Your team gets access, we conduct training sessions, and configure roles and permissions for each member." },
        { phase: "Week 3", title: "Integration & Testing", desc: "We integrate your existing tools, test all workflows, and ensure everything runs smoothly before going live." },
        { phase: "Week 4", title: "Go Live & Optimization", desc: "Your platform goes live! We monitor performance, optimize settings, and provide ongoing support." },
        { phase: "Ongoing", title: "Growth & Support", desc: `Continuous support with regular check-ins, feature updates, and strategic guidance to help your brand grow with ${companyName}.` },
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

        ty += 46;
      }

      y += 276;

      // Expectation highlights
      y = ensureSpace(doc, y, 100, W, H, P);
      drawCard(doc, P, y, CW, 80);
      doc.font(FONT.bold).fontSize(11).fillColor(C.textPrimary);
      doc.text("What Makes Us Different", P + 18, y + 14, { width: CW - 36 });

      const diffs = [
        "Dedicated onboarding specialist assigned to your brand",
        "Unlimited support during your first 30 days",
        "Custom configuration tailored to your business needs",
        "Regular platform updates with new features every month",
      ];
      let diffY = y + 34;
      for (const diff of diffs) {
        doc.font(FONT.regular).fontSize(8.5).fillColor(C.textSecondary);
        doc.circle(P + 26, diffY + 4, 2.5).fill(C.gold);
        doc.text(diff, P + 36, diffY - 2, { width: CW - 54 });
        diffY += 14;
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

      // Main contact card
      drawCardBright(doc, P, y, CW, 180);

      let cy = y + 16;
      // Email
      doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
      doc.text("EMAIL", P + 20, cy);
      doc.font(FONT.regular).fontSize(12).fillColor(C.gold);
      doc.text(settings.companyEmail || "N/A", P + 20, cy + 12);
      cy += 34;

      // Phone
      if (settings.companyPhone) {
        doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
        doc.text("PHONE", P + 20, cy);
        doc.font(FONT.regular).fontSize(12).fillColor(C.textPrimary);
        doc.text(settings.companyPhone, P + 20, cy + 12);
        cy += 34;
      }

      // WhatsApp
      if (settings.whatsappNumber) {
        doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
        doc.text("WHATSAPP", P + 20, cy);
        doc.font(FONT.regular).fontSize(12).fillColor(C.green);
        doc.text(settings.whatsappNumber, P + 20, cy + 12);
        cy += 34;
      }

      // Website
      if (settings.companyWebsite) {
        doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
        doc.text("WEBSITE", P + 20, cy);
        doc.font(FONT.regular).fontSize(12).fillColor(C.gold);
        doc.text(settings.companyWebsite, P + 20, cy + 12);
        cy += 34;
      }

      // Address
      if (settings.companyAddress) {
        doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
        doc.text("ADDRESS", P + 20, cy);
        doc.font(FONT.regular).fontSize(10).fillColor(C.textPrimary);
        doc.text(settings.companyAddress, P + 20, cy + 12, { width: CW - 40 });
        cy += 34;
      }

      // Support hours
      if (settings.supportHours) {
        doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
        doc.text("SUPPORT HOURS", P + 20, cy);
        doc.font(FONT.regular).fontSize(10).fillColor(C.textSecondary);
        doc.text(settings.supportHours, P + 20, cy + 12);
      }

      y += 196;

      // Social media section
      y = ensureSpace(doc, y, 80, W, H, P);
      const socialLinks = [
        { label: "Instagram", url: settings.instagramUrl },
        { label: "Facebook", url: settings.facebookUrl },
        { label: "X / Twitter", url: settings.twitterUrl },
        { label: "LinkedIn", url: settings.linkedinUrl },
        { label: "Discord", url: settings.discordUrl },
        { label: "Reddit", url: settings.redditUrl },
        { label: "YouTube", url: settings.youtubeUrl },
        { label: "TikTok", url: settings.tiktokUrl },
      ].filter((s) => s.url);

      if (socialLinks.length > 0) {
        drawCard(doc, P, y, CW, 30 + Math.ceil(socialLinks.length / 4) * 28);

        doc.font(FONT.bold).fontSize(9).fillColor(C.textPrimary);
        doc.text("Follow Us on Social Media", P + 18, y + 10, { width: CW - 36 });

        let sy = y + 30;
        const socialColW = (CW - 36) / 4;

        for (let i = 0; i < socialLinks.length; i++) {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const sx = P + 18 + col * socialColW;
          const sRowY = sy + row * 28;

          doc.font(FONT.bold).fontSize(8).fillColor(C.gold);
          doc.text(socialLinks[i].label, sx, sRowY);
          doc.font(FONT.regular).fontSize(7).fillColor(C.textLight);
          doc.text(socialLinks[i].url!, sx, sRowY + 12, { width: socialColW - 4, lineBreak: true });
        }
      }

      // CTA at bottom
      const ctaY = H - 130;
      doc.save();
      doc.roundedRect(W / 2 - 140, ctaY, 280, 44, 10).fill(C.gold);
      doc.font(FONT.bold).fontSize(12).fillColor("#ffffff");
      doc.text("Ready to Transform Your Brand?", W / 2 - 140, ctaY + 10, { width: 280, align: "center" });
      doc.font(FONT.regular).fontSize(9).fillColor("#ffffff");
      doc.text(settings.companyWebsite || "Visit our website to get started", W / 2 - 140, ctaY + 28, { width: 280, align: "center" });
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
