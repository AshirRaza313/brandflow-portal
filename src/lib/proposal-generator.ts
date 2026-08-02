// @ts-nocheck — Phase 8: pre-existing TS errors (Decimal/Prisma types, etc.) pending migration
// ============================================================================
// Proposal PDF Generator - Ultra-Premium Edition
// Uses pdfkit with EMBEDDED TTF fonts (base64 in font-buffers.ts)
// Serverless-safe - no filesystem dependency for fonts
// Valtriox Gold Color Scheme
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

export interface ProposalSettings {
  companyName: string;
  tagline: string;
  logoUrl?: string | null;
  companyEmail: string;
  companyPhone?: string | null;
  companyWebsite?: string | null;
  companyAddress?: string | null;
  whatsappNumber?: string | null;
  supportHours?: string;
  primaryBrandColor?: string;
}

export interface ProposalData {
  id: string;
  clientName: string;
  clientEmail: string;
  clientCompany?: string | null;
  clientPhone?: string | null;
  type: string;
  title: string;
  status: string;
  totalCost?: number | null;
  currency: string;
  currencySymbol: string;
  validUntil?: string | null;
  content: any;
  notes?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

// ── Colors - Valtriox Brand 2026 (Charcoal / Modern Gold / White) ──

const C = {
  bg: "#FAFAFA",            // White (per brand spec)
  bg2: "#F4F4F5",
  bg3: "#EFEFEF",
  gold: "#D4A73A",          // Modern Gold
  goldBright: "#B8942F",
  goldMid: "#E8BD58",
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
  white: "#FAFAFA",         // White (matches bg)
  watermark: "#D4A73A",
};

// ── Brand Logo Helpers (complete founder logo, aspect-matched golden frame) ──
// Per founder directive, this logo is the SOLE brand mark on every PDF
// (proposals, lead magnets, invoices, reports) regardless of which org
// the document belongs to. The border is solid (not rounded) in Modern Gold.

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

// ── Proposal Type Content Templates (Ultra-Premium) ──

function getProposalTypeContent(type: string): {
  sectionTitle: string;
  scopeItems: { title: string; description: string }[];
  kpis: string[];
  approach: { step: string; title: string; description: string }[];
  whyValtriox: { title: string; description: string }[];
  timelineItems: { phase: string; title: string; duration: string }[];
  pricingItems: { item: string; description: string; amount: string }[];
  execSummary: string;
} {
  switch (type) {
    case "brand_management":
      return {
        sectionTitle: "Brand Management Services",
        execSummary: "Our Brand Management service provides a holistic approach to building, nurturing, and growing your brand identity in the marketplace. We combine strategic thinking with creative excellence to deliver a brand that resonates with your target audience and drives lasting business growth.",
        scopeItems: [
          { title: "Brand Strategy Development", description: "Comprehensive brand audit, competitive analysis, positioning strategy, and brand architecture development aligned with your business objectives. We conduct in-depth market research to understand your competitive landscape and identify unique positioning opportunities that differentiate you from industry incumbents." },
          { title: "Visual Identity Design", description: "Logo design, color palette, typography system, iconography, and complete brand guidelines documentation for consistent visual representation across all digital and print channels. Every design element is crafted to communicate your brand values and evoke the desired emotional response." },
          { title: "Brand Guidelines & Standards", description: "Detailed brand book covering logo usage, color specifications, typography rules, imagery direction, and tone of voice guidelines to ensure brand consistency across all touchpoints. Includes a digital assets toolkit for seamless team adoption." },
          { title: "Market Positioning", description: "Target audience analysis, market research, value proposition development, and go-to-market strategy for maximum brand impact in your industry. We map the competitive landscape and identify white-space opportunities to position your brand for category leadership." },
          { title: "Brand Communication Strategy", description: "Development of a comprehensive messaging framework, tagline creation, and communication plan that articulates your brand promise to internal and external stakeholders. Includes channel-specific messaging variants optimized for each platform." },
          { title: "Brand Performance Monitoring", description: "Ongoing brand health tracking, sentiment analysis, brand awareness measurement, and quarterly brand performance reviews with actionable optimization recommendations. Leverages real-time social listening tools and brand equity dashboards." },
          { title: "Internal Brand Culture & Alignment", description: "Employee brand ambassador program, internal communication toolkit, brand values workshops, and culture alignment initiatives to ensure your entire organization lives and breathes the brand promise authentically." },
        ],
        kpis: [
          "Brand awareness increase of 45-65% within 6 months, measured via surveys and social reach",
          "Consistent brand recognition score above 88% among target demographics",
          "25% improvement in customer brand recall within the first quarter",
          "Brand perception alignment score of 92%+ between intended and actual perception",
          "55% increase in social media brand mentions and share of voice",
          "Net Promoter Score (NPS) improvement of 15+ points within 6 months",
          "85%+ employee brand alignment score on internal culture assessments",
        ],
        approach: [
          { step: "Step 1: Discover", title: "Deep Discovery & Research", description: "We begin with an intensive discovery phase involving stakeholder interviews, competitive audits, audience research, and market analysis to build a comprehensive understanding of your brand landscape." },
          { step: "Step 2: Define", title: "Strategic Framework Development", description: "Using insights from discovery, we craft your brand strategy including positioning, messaging architecture, personality traits, and visual direction that sets your brand apart." },
          { step: "Step 3: Deliver", title: "Execution & Launch", description: "We bring the strategy to life through design, guidelines, and launch materials, followed by ongoing monitoring and optimization to ensure sustained brand growth." },
        ],
        whyValtriox: [
          { title: "Data-Driven Strategy", description: "Every brand decision we make is backed by market research, audience insights, and competitive intelligence, ensuring maximum impact and ROI." },
          { title: "Cross-Industry Expertise", description: "Our team has delivered successful brand strategies across diverse industries, bringing fresh perspectives and proven methodologies to every project." },
          { title: "End-to-End Execution", description: "From initial concept to final brand guidelines and beyond, we handle every aspect of brand development with a single dedicated team." },
          { title: "Measurable Results", description: "We establish clear KPIs at the outset and provide regular performance reports, so you can track the tangible impact of our brand management work." },
        ],
        timelineItems: [
          { phase: "Week 1 to 2", title: "Discovery & Research", duration: "Brand audit, competitive analysis, stakeholder interviews" },
          { phase: "Week 3 to 4", title: "Strategy & Positioning", duration: "Brand strategy, positioning, messaging framework" },
          { phase: "Week 5 to 7", title: "Visual Identity", duration: "Logo design, color palette, typography, brand elements" },
          { phase: "Week 8", title: "Guidelines & Delivery", duration: "Brand guidelines document, asset delivery, handover" },
        ],
        pricingItems: [
          { item: "Brand Strategy", description: "Full brand audit & strategy development", amount: "30%" },
          { item: "Visual Identity", description: "Logo, colors, typography, icons", amount: "35%" },
          { item: "Brand Guidelines", description: "Complete brand book & standards", amount: "20%" },
          { item: "Communication Strategy", description: "Messaging framework & launch plan", amount: "10%" },
          { item: "Support & Revisions", description: "Two rounds of revisions + support", amount: "5%" },
        ],
      };
    case "digital_marketing":
      return {
        sectionTitle: "Digital Marketing Services",
        execSummary: "Our Digital Marketing service delivers a fully integrated, data-driven marketing ecosystem designed to maximize your online visibility, generate qualified leads, and accelerate revenue growth. We combine SEO, social media, paid advertising, and content marketing into a cohesive strategy.",
        scopeItems: [
          { title: "Search Engine Optimization (SEO)", description: "Technical SEO audit, on-page optimization, keyword research, content strategy, and ongoing SEO monitoring for improved organic visibility across all major search engines. Includes Core Web Vitals optimization and structured data implementation." },
          { title: "Social Media Management", description: "Platform strategy, content calendar, post creation, community management, and analytics reporting across all major social platforms to build engaged audiences. Each platform receives tailored content formats optimized for algorithmic performance." },
          { title: "Content Strategy & Marketing", description: "Editorial calendar, blog articles, video scripts, infographics, and thought leadership content to establish authority in your market and drive organic traffic. Content is data-driven, targeting high-intent keywords and audience pain points." },
          { title: "Paid Advertising (PPC)", description: "Google Ads, Meta Ads, LinkedIn Ads campaign setup, management, optimization, and ROI-focused budget allocation strategy for maximum return on ad spend. Includes advanced audience segmentation and retargeting funnel development." },
          { title: "Email Marketing Automation", description: "Campaign design, segmentation, automation workflows, A/B testing, and analytics for nurturing leads and driving customer retention and repeat purchases. Implements behavioral triggers and lifecycle-based drip sequences." },
          { title: "Conversion Rate Optimization", description: "Landing page optimization, A/B testing, funnel analysis, user behavior tracking, and data-driven improvements to maximize conversion rates across all channels. Includes heatmap analysis and session recording reviews." },
          { title: "Marketing Analytics & Attribution", description: "Unified cross-channel analytics dashboard, multi-touch attribution modeling, custom reporting, and actionable intelligence that connects marketing activities directly to revenue outcomes for ROI clarity." },
        ],
        kpis: [
          "160-210% increase in organic website traffic within 6 months",
          "35-55% improvement in conversion rates across all channels",
          "30% reduction in cost per acquisition (CPA) by month 4",
          "45% growth in social media engagement rate within 90 days",
          "3.5x increase in marketing qualified leads (MQLs)",
          "25% improvement in email open and click-through rates",
          "Full-funnel marketing attribution with 95%+ data accuracy",
        ],
        approach: [
          { step: "Step 1: Audit", title: "Comprehensive Digital Audit", description: "We conduct a thorough audit of your current digital presence, including website health, social media performance, content effectiveness, and competitive landscape analysis." },
          { step: "Step 2: Build", title: "Strategy & Campaign Development", description: "Based on audit findings, we develop a tailored digital marketing strategy with detailed campaign plans, content calendars, and budget allocation for each channel." },
          { step: "Step 3: Scale", title: "Launch, Optimize & Scale", description: "We launch campaigns across all channels, continuously monitor performance, A/B test creative elements, and scale successful tactics to maximize your marketing ROI." },
        ],
        whyValtriox: [
          { title: "Full-Funnel Expertise", description: "We manage the entire marketing funnel from awareness to conversion, ensuring seamless customer journeys across all digital touchpoints." },
          { title: "ROI-Focused Approach", description: "Every marketing dollar is allocated based on data analysis and performance metrics, ensuring maximum return on your marketing investment." },
          { title: "Platform Certified Team", description: "Our team holds certifications across Google, Meta, LinkedIn, and HubSpot, bringing platform-specific expertise to every campaign." },
          { title: "Transparent Reporting", description: "Real-time dashboards and detailed weekly reports give you complete visibility into campaign performance and spending allocation." },
        ],
        timelineItems: [
          { phase: "Week 1 to 2", title: "Setup & Audit", duration: "Platform setup, SEO audit, social audit" },
          { phase: "Week 3 to 4", title: "Strategy & Content", duration: "Content calendar, ad campaigns, automation" },
          { phase: "Week 5 to 8", title: "Launch & Optimize", duration: "Campaign launch, monitoring, A/B testing" },
          { phase: "Ongoing", title: "Report & Scale", duration: "Monthly reports, optimization, scaling" },
        ],
        pricingItems: [
          { item: "SEO & Content", description: "On-page, content, keyword strategy", amount: "25%" },
          { item: "Social Media", description: "Management, content, community", amount: "20%" },
          { item: "Paid Advertising", description: "Campaign setup, management, optimization", amount: "30%" },
          { item: "Email & CRO", description: "Automation, conversion optimization", amount: "15%" },
          { item: "Analytics & Reporting", description: "Dashboards, reports, insights", amount: "10%" },
        ],
      };
    case "tech_integration":
      return {
        sectionTitle: "Technology Integration Services",
        execSummary: "Our Technology Integration service bridges the gap between your existing systems and your digital ambitions. We design and implement seamless integrations that automate workflows, eliminate data silos, and create a unified technology ecosystem that powers your business operations.",
        scopeItems: [
          { title: "Custom API Development", description: "Design and development of custom RESTful APIs, microservices architecture, and integration middleware tailored to your specific business workflows and data requirements. All APIs include comprehensive documentation, versioning, and rate limiting." },
          { title: "Workflow Automation", description: "End-to-end automation of business processes using intelligent workflow engines, reducing manual work by up to 80% and eliminating human error in critical operations. Includes exception handling and manual override capabilities." },
          { title: "Third-Party Integrations", description: "Seamless integration with payment gateways, CRM systems, ERP platforms, analytics tools, email marketing platforms, and other essential business software. Each integration is stress-tested for reliability." },
          { title: "Data Synchronization", description: "Real-time data sync across platforms with conflict resolution, data mapping, and transformation pipeline setup to ensure data consistency everywhere. Implements bidirectional sync with rollback support." },
          { title: "System Architecture Review", description: "Comprehensive assessment of your current technology stack with recommendations for optimization, consolidation, and modernization of existing systems. Includes a technology debt assessment and modernization roadmap." },
          { title: "Security & Compliance", description: "Integration security hardening, data encryption implementation, access control configuration, and compliance setup for industry standards and regulations. Covers OWASP security best practices." },
          { title: "Monitoring & Observability", description: "Implementation of comprehensive monitoring dashboards, real-time alerting systems, log aggregation, performance metrics tracking, and API health monitoring with automated incident response workflows." },
        ],
        kpis: [
          "85% reduction in manual data entry tasks within 60 days of deployment",
          "Real-time data synchronization with 99.95% uptime SLA",
          "65% faster processing of business workflows post-integration",
          "Zero data loss during system migrations with verified rollback testing",
          "55% reduction in operational costs through automation within 6 months",
          "Complete integration within the defined project timeline with on-time delivery",
          "Mean time to detection (MTTD) of integration issues under 5 minutes",
        ],
        approach: [
          { step: "Step 1: Assess", title: "Systems Assessment & Planning", description: "We map your current technology ecosystem, identify integration points, document data flows, and architect the optimal solution for seamless connectivity." },
          { step: "Step 2: Build", title: "Development & Configuration", description: "Our engineers develop custom APIs, configure middleware, and build automation workflows following industry best practices and security standards." },
          { step: "Step 3: Deploy", title: "Testing, Migration & Go-Live", description: "Comprehensive testing including stress testing, data migration with rollback capability, staged deployment, and post-launch monitoring and support." },
        ],
        whyValtriox: [
          { title: "Technology Agnostic", description: "We work across all major platforms and technologies, choosing the best tools for your specific needs rather than forcing a one-size-fits-all solution." },
          { title: "Security-First Approach", description: "Every integration we build follows security best practices including encryption, authentication, and compliance with data protection regulations." },
          { title: "Scalable Architecture", description: "We design integrations that grow with your business, handling increased volume and complexity without requiring complete redesigns." },
          { title: "Post-Deployment Support", description: "30-day post-launch support included, with options for ongoing maintenance contracts to ensure your integrations continue to perform optimally." },
        ],
        timelineItems: [
          { phase: "Week 1 to 2", title: "Assessment & Planning", duration: "System audit, integration mapping, architecture" },
          { phase: "Week 3 to 5", title: "Development", duration: "API development, workflow creation" },
          { phase: "Week 6 to 7", title: "Testing & Integration", duration: "End-to-end testing, UAT, migration" },
          { phase: "Week 8+", title: "Deployment & Support", duration: "Production deployment, monitoring, support" },
        ],
        pricingItems: [
          { item: "API Development", description: "Custom API design & development", amount: "30%" },
          { item: "Automation", description: "Workflow engine & process automation", amount: "25%" },
          { item: "Integrations", description: "Third-party system connections", amount: "25%" },
          { item: "Security & Testing", description: "Security hardening, QA, UAT", amount: "12%" },
          { item: "Deployment & Support", description: "Go-live, monitoring, 30-day support", amount: "8%" },
        ],
      };
    case "e_commerce":
      return {
        sectionTitle: "E-Commerce Setup Services",
        execSummary: "Our E-Commerce Setup service delivers a complete, conversion-optimized online store that provides seamless shopping experiences for your customers. From platform configuration to payment processing and logistics, we build the foundation for your digital retail success.",
        scopeItems: [
          { title: "Online Store Setup", description: "Complete e-commerce platform configuration including product catalog, category structure, search functionality, and user experience optimization for maximum conversions. Includes mobile-first responsive design with optimized navigation." },
          { title: "Payment Gateway Integration", description: "Secure payment processing setup with multiple payment methods, PCI compliance, fraud detection, and transaction monitoring for safe and smooth transactions. Supports Stripe, PayPal, and regional payment providers." },
          { title: "Logistics & Shipping", description: "Shipping rate configuration, order fulfillment workflows, tracking integration, and multi-carrier support for efficient and reliable delivery management. Includes automated shipping label generation." },
          { title: "Catalog Management", description: "Product information management, bulk import/export, inventory tracking, pricing rules, and variant management system for efficient catalog operations. Supports automated inventory alerts and reorder points." },
          { title: "Store Design & Theme", description: "Custom store theme development, responsive design, product page optimization, and checkout flow design to maximize conversion rates and user satisfaction. Includes abandoned cart recovery features." },
          { title: "Analytics & Reporting", description: "E-commerce analytics setup including sales tracking, conversion funnels, product performance reports, and customer behavior insights for data-driven decisions. Integrates Google Analytics 4 and Meta Pixel." },
          { title: "Customer Retention & Loyalty", description: "Customer account system, wishlist functionality, loyalty program integration, personalized product recommendations, and automated post-purchase email sequences to drive repeat purchases and customer lifetime value." },
        ],
        kpis: [
          "Store launch within 6 weeks of project start",
          "Mobile-optimized with 97+ Lighthouse performance score",
          "Checkout conversion rate above 4.0% with optimized funnel",
          "Average page load time under 2.5 seconds on all devices",
          "Complete product catalog imported with 100% data accuracy",
          "PCI DSS Level 1 compliant payment processing",
          "15% customer repeat purchase rate within the first 90 days post-launch",
        ],
        approach: [
          { step: "Step 1: Plan", title: "Store Architecture & Design", description: "We define your store structure, select the optimal platform, design the user experience, and plan the complete e-commerce ecosystem for your business." },
          { step: "Step 2: Build", title: "Development & Configuration", description: "Our team builds your store, configures all systems, imports product data, and sets up payment and shipping integrations with thorough testing at each stage." },
          { step: "Step 3: Launch", title: "Testing, Training & Go-Live", description: "Comprehensive QA testing, staff training on store management, staged go-live with monitoring, and 30-day post-launch optimization support." },
        ],
        whyValtriox: [
          { title: "Platform Expertise", description: "Deep experience with Shopify, WooCommerce, Magento, and custom solutions, enabling us to recommend and implement the perfect platform for your needs." },
          { title: "Conversion-Focused Design", description: "Every design decision is informed by conversion rate optimization principles, ensuring your store turns visitors into paying customers." },
          { title: "Scalable Infrastructure", description: "We build stores that handle growth gracefully, from your first sale to your millionth, without performance degradation." },
          { title: "Ongoing Partnership", description: "Post-launch support and optimization services ensure your store continues to perform and evolve with changing market demands." },
        ],
        timelineItems: [
          { phase: "Week 1 to 2", title: "Platform Setup", duration: "Store configuration, theme, navigation" },
          { phase: "Week 3 to 4", title: "Product Catalog", duration: "Product upload, categories, pricing" },
          { phase: "Week 5 to 6", title: "Payments & Shipping", duration: "Gateway integration, shipping setup" },
          { phase: "Week 7", title: "Testing & Launch", duration: "UAT, performance testing, go-live" },
        ],
        pricingItems: [
          { item: "Store Setup & Design", description: "Platform config, theme, UX design", amount: "25%" },
          { item: "Product Catalog", description: "Products, categories, search setup", amount: "20%" },
          { item: "Payments & Logistics", description: "Gateway, shipping, fulfillment", amount: "25%" },
          { item: "Testing & QA", description: "UAT, performance, security testing", amount: "15%" },
          { item: "Launch & Support", description: "Go-live, training, 30-day support", amount: "15%" },
        ],
      };
    case "enterprise":
      return {
        sectionTitle: "Enterprise Solution Services",
        execSummary: "Our Enterprise Solution service delivers a comprehensive, white-glove implementation of the Valtriox platform tailored to your organization's unique requirements. We provide end-to-end support from initial architecture design through deployment, training, and ongoing optimization.",
        scopeItems: [
          { title: "Full Platform Implementation", description: "End-to-end implementation of the complete Valtriox platform including all modules, custom configurations, and enterprise-grade infrastructure designed for your scale. Includes multi-tenant setup and advanced user hierarchy." },
          { title: "Team Training & Onboarding", description: "Comprehensive training programs for all team members including admin training, user workshops, documentation, and certification programs for platform mastery. Offers both live and self-paced learning pathways." },
          { title: "Dedicated Support & SLA", description: "Priority support with guaranteed response times, dedicated account manager, monthly performance reviews, and quarterly business reviews for continuous optimization. Includes 24/7 critical issue escalation." },
          { title: "Custom Development", description: "Bespoke feature development, custom integrations, API extensions, and advanced reporting tailored specifically to your enterprise requirements and workflows. All custom features follow enterprise coding standards." },
          { title: "Data Migration & Integration", description: "Secure migration of existing data, system integration with current tools, data validation, and comprehensive testing to ensure zero data loss and business continuity. Includes parallel-run verification." },
          { title: "Security & Compliance", description: "Enterprise security hardening, role-based access control, audit logging, data encryption, and compliance configuration for industry standards including SOC 2 and GDPR. Conducts annual penetration testing." },
          { title: "Change Management & Adoption", description: "Structured change management program including stakeholder engagement, adoption metrics tracking, feedback loops, and continuous improvement cycles to maximize organizational buy-in and platform utilization rates." },
        ],
        kpis: [
          "Full platform deployment within 16 weeks with phased rollout",
          "99.95% system uptime guarantee with enterprise SLA backing",
          "Complete data migration with zero data loss, verified by dual audits",
          "100% team onboarding completion within 21 days of go-live",
          "55% reduction in operational overhead within the first quarter",
          "Dedicated account manager response within 1 hour for P1 issues",
          "80%+ platform adoption rate among target users within 60 days",
        ],
        approach: [
          { step: "Step 1: Architect", title: "Enterprise Architecture Design", description: "We design a tailored solution architecture covering infrastructure, data flows, integrations, and custom modules that align with your enterprise requirements." },
          { step: "Step 2: Implement", title: "Development & Migration", description: "Our enterprise team executes the implementation plan, develops custom features, migrates data, and configures all systems with rigorous quality assurance." },
          { step: "Step 3: Launch & Support", description: "Staged rollout with comprehensive training, dedicated go-live support, and ongoing SLA-backed optimization to ensure long-term enterprise success." },
        ],
        whyValtriox: [
          { title: "Enterprise-Grade Reliability", description: "Our platform is built on enterprise-grade infrastructure with redundancy, disaster recovery, and 99.9% uptime guarantees for mission-critical operations." },
          { title: "Dedicated Success Team", description: "You get a dedicated account manager, solutions architect, and support team who understand your business and proactively optimize your platform." },
          { title: "Custom Development Power", description: "Our engineering team can build any custom feature or integration your enterprise needs, providing unlimited extensibility for your unique workflows." },
          { title: "Compliance Ready", description: "Built-in compliance frameworks for major industry standards, with dedicated support for audit preparation and regulatory requirements." },
        ],
        timelineItems: [
          { phase: "Month 1", title: "Planning & Architecture", duration: "Requirements, architecture, infrastructure" },
          { phase: "Month 2 to 3", title: "Implementation", duration: "Core modules, custom development" },
          { phase: "Month 4", title: "Testing & Migration", duration: "UAT, data migration, performance" },
          { phase: "Month 5", title: "Training & Go-Live", duration: "Team training, soft launch, handover" },
          { phase: "Ongoing", title: "Support & Optimization", duration: "SLA support, quarterly reviews, updates" },
        ],
        pricingItems: [
          { item: "Platform License", description: "Enterprise license & infrastructure", amount: "20%" },
          { item: "Implementation", description: "Setup, configuration, custom dev", amount: "35%" },
          { item: "Data Migration", description: "Secure migration & validation", amount: "10%" },
          { item: "Training", description: "Team training & documentation", amount: "15%" },
          { item: "Annual Support", description: "SLA, updates, quarterly reviews", amount: "20%" },
        ],
      };
    case "social_media_management":
      return {
        sectionTitle: "Social Media Management Services",
        execSummary: "Our Social Media Management service transforms your brand's social presence into a powerful growth engine. We create compelling content, build engaged communities, and drive measurable business results across all major social platforms with data-driven strategy and creative excellence.",
        scopeItems: [
          { title: "Platform Strategy & Setup", description: "Comprehensive social media audit, competitor benchmarking, platform selection strategy, and complete profile optimization across Instagram, TikTok, YouTube, LinkedIn, Twitter/X, and Facebook." },
          { title: "Content Creation & Calendar", description: "Professional content production including reels, carousels, stories, tutorials, and articles with a strategic content calendar aligned with platform algorithm priorities and audience behavior patterns." },
          { title: "Community Management & Growth", description: "Active community engagement, DM automation for lead capture, comment management, hashtag strategy optimization, and audience growth tactics targeting 15-20% monthly follower increase." },
          { title: "Analytics & Performance Reporting", description: "Weekly performance dashboards, monthly strategy reviews, engagement rate optimization, content ROI analysis, and data-driven recommendations for continuous improvement." },
          { title: "Influencer & Partnership Strategy", description: "Identification and outreach to relevant influencers and brand partners, collaboration management, campaign tracking, and ROI analysis for influencer marketing initiatives." },
          { title: "Social Advertising Management", description: "Boosted post strategy, paid social campaigns, audience targeting, creative testing, and budget optimization across Meta, TikTok, LinkedIn, and other social ad platforms." },
        ],
        kpis: [
          "15-20% monthly follower growth across all platforms",
          "Engagement rate increase of 200% within 3 months",
          "50+ high-quality content pieces per month",
          "100% response rate to comments and DMs within 4 hours",
          "Weekly performance reports with actionable insights",
          "30% increase in website traffic from social channels",
        ],
        approach: [
          { step: "Step 1: Audit", title: "Social Presence Audit & Strategy", description: "We analyze your current social media presence, audit competitor strategies, research your audience demographics, and develop a comprehensive social media playbook." },
          { step: "Step 2: Create", title: "Content Production & Scheduling", description: "Our creative team produces platform-optimized content, manages the editorial calendar, and schedules posts for optimal engagement times across all channels." },
          { step: "Step 3: Grow", title: "Community Building & Optimization", description: "We actively engage your audience, respond to interactions, implement growth strategies, and continuously optimize based on performance data and platform changes." },
        ],
        whyValtriox: [
          { title: "Platform Algorithm Expertise", description: "Our team stays at the forefront of platform algorithm changes, ensuring your content strategy adapts quickly to maintain and grow organic reach." },
          { title: "Creative Excellence", description: "Our in-house creative team produces scroll-stopping content that stands out in crowded feeds and drives meaningful engagement with your brand." },
          { title: "Data-Driven Decisions", description: "Every content and strategy decision is informed by performance data, audience insights, and industry benchmarks to maximize your social media ROI." },
          { title: "Authentic Community Building", description: "We build genuine relationships with your audience through thoughtful engagement, not just vanity metrics, creating loyal brand advocates." },
        ],
        timelineItems: [
          { phase: "Week 1 to 2", title: "Audit & Strategy", duration: "Social audit, competitor analysis, strategy document" },
          { phase: "Week 3 to 4", title: "Setup & Calendar", duration: "Profile optimization, content calendar, asset creation" },
          { phase: "Week 5 to 8", title: "Launch & Grow", duration: "Content launch, community building, growth tactics" },
          { phase: "Ongoing", title: "Optimize & Scale", duration: "Analytics-driven optimization, scaling strategy" },
        ],
        pricingItems: [
          { item: "Strategy & Setup", description: "Audit, strategy, profile optimization", amount: "15%" },
          { item: "Content Creation", description: "Posts, reels, stories, articles", amount: "40%" },
          { item: "Community Management", description: "Engagement, DMs, growth tactics", amount: "20%" },
          { item: "Analytics & Reporting", description: "Dashboards, reports, optimization", amount: "10%" },
          { item: "Paid Social & Influencers", description: "Social ads, influencer outreach", amount: "15%" },
        ],
      };
    case "content_creation":
      return {
        sectionTitle: "Content Creation Services",
        execSummary: "Our Content Creation service delivers a comprehensive content engine that produces high-quality, platform-optimized content at scale. From short-form videos to long-form thought leadership, we create content that captures attention, builds authority, and drives business results.",
        scopeItems: [
          { title: "Content Audit & Strategy Development", description: "Comprehensive audit of existing content assets, gap analysis, content pillar development, and a documented content strategy aligned with business objectives and target audience personas." },
          { title: "Short-Form Video Production", description: "Professional 30-60 second video content for TikTok, Instagram Reels, and YouTube Shorts including scripting, filming guidance, editing, and platform-specific optimization for maximum algorithmic reach." },
          { title: "Long-Form Content & Thought Leadership", description: "Blog articles, whitepapers, case studies, and LinkedIn thought leadership pieces that establish your brand as an industry authority and drive organic search traffic." },
          { title: "Content Distribution & Repurposing", description: "Multi-platform content distribution strategy, content repurposing workflows that transform one piece into 7+ platform-specific assets, and cross-promotion tactics." },
          { title: "Visual Content & Graphics", description: "Professional graphic design for social media posts, infographics, presentation decks, branded templates, and visual storytelling assets that enhance content performance." },
          { title: "SEO Content Optimization", description: "Keyword research, content optimization for search engines, meta description writing, internal linking strategy, and content performance tracking for organic growth." },
        ],
        kpis: [
          "30+ pieces of content produced per month",
          "200% increase in organic content engagement",
          "Top 3 ranking for 10+ target keywords within 6 months",
          "Content repurposing ratio of 1:7 (one piece becomes seven assets)",
          "50% increase in average time on page",
          "Consistent publishing schedule with 98% on-time delivery",
        ],
        approach: [
          { step: "Step 1: Strategy", title: "Content Strategy & Planning", description: "We develop a comprehensive content strategy including topic clusters, keyword mapping, content pillars, editorial calendar, and audience persona alignment." },
          { step: "Step 2: Produce", title: "Content Creation & Production", description: "Our team of writers, designers, and video producers create high-quality content optimized for each platform, following brand guidelines and SEO best practices." },
          { step: "Step 3: Distribute", title: "Distribution & Performance Analysis", description: "We distribute content across all channels, monitor performance, repurpose top-performing pieces, and continuously refine the strategy based on data insights." },
        ],
        whyValtriox: [
          { title: "Multi-Format Production", description: "From written articles to video, graphics, and interactive content, our team produces every format needed to dominate your content channels." },
          { title: "SEO-First Approach", description: "Every piece of content is strategically optimized for search engines, ensuring your content investment drives lasting organic visibility and traffic." },
          { title: "Scalable Production", description: "Our established workflows and talented team enable consistent, high-volume content production without sacrificing quality or brand consistency." },
          { title: "Performance-Driven Iteration", description: "We analyze content performance weekly and adapt our strategy, topics, and formats to continuously improve results and maximize content ROI." },
        ],
        timelineItems: [
          { phase: "Week 1 to 2", title: "Audit & Planning", duration: "Content audit, strategy, editorial calendar" },
          { phase: "Week 3 to 6", title: "Production", duration: "Video, articles, graphics production" },
          { phase: "Week 7 to 8", title: "Distribution", duration: "Multi-platform launch, repurposing" },
          { phase: "Ongoing", title: "Optimize", duration: "Performance analysis, content iteration" },
        ],
        pricingItems: [
          { item: "Strategy & Audit", description: "Content audit, strategy document", amount: "10%" },
          { item: "Video Production", description: "Short-form video content creation", amount: "30%" },
          { item: "Written Content", description: "Articles, thought leadership, SEO content", amount: "30%" },
          { item: "Visual Content", description: "Graphics, infographics, templates", amount: "15%" },
          { item: "Distribution & Analytics", description: "Multi-platform distribution, reporting", amount: "15%" },
        ],
      };
    case "seo_optimization":
      return {
        sectionTitle: "SEO Optimization Services",
        execSummary: "Our SEO Optimization service delivers sustainable, organic search growth through a comprehensive approach covering technical excellence, content strategy, and authority building. We drive qualified traffic that converts, building long-term value for your business through search engine dominance.",
        scopeItems: [
          { title: "Technical SEO Audit & Fixes", description: "Comprehensive technical SEO audit covering site speed, Core Web Vitals, mobile-friendliness, crawlability, indexation issues, structured data, and schema markup implementation." },
          { title: "On-Page & Content SEO", description: "Keyword research and mapping, meta tag optimization, content gap analysis, internal linking strategy, and SEO-optimized content creation targeting high-intent commercial keywords." },
          { title: "Local & International SEO", description: "Google Business Profile optimization, local citation building, multi-region targeting strategy, hreflang implementation, and international market expansion support." },
          { title: "Link Building & Authority", description: "White-hat link building campaigns, digital PR outreach, guest posting strategy, competitor backlink analysis, and domain authority development program." },
          { title: "Keyword Research & Strategy", description: "In-depth keyword research identifying high-value opportunities, search intent analysis, keyword clustering, and priority-based content targeting strategy." },
          { title: "SEO Monitoring & Reporting", description: "Rank tracking, organic traffic analysis, conversion tracking, competitor monitoring, and monthly SEO performance reports with actionable optimization recommendations." },
        ],
        kpis: [
          "Top 10 rankings for 15+ target keywords within 6 months",
          "150-250% increase in organic traffic",
          "Domain Authority increase of 15-20 points",
          "First page rankings for 5+ high-volume keywords",
          "40% increase in organic leads and conversions",
          "Technical SEO score of 95+ across all audit criteria",
        ],
        approach: [
          { step: "Step 1: Audit", title: "Comprehensive SEO Audit", description: "We perform an exhaustive technical, on-page, and off-page SEO audit, identifying every opportunity and issue affecting your search visibility." },
          { step: "Step 2: Optimize", title: "Implementation & Content Strategy", description: "Our team implements technical fixes, optimizes existing content, creates new SEO-optimized content, and builds authority through strategic link building." },
          { step: "Step 3: Scale", title: "Growth & Authority Building", description: "We expand keyword targeting, scale content production, build authoritative backlinks, and continuously optimize to achieve and maintain top search rankings." },
        ],
        whyValtriox: [
          { title: "White-Hat Only", description: "We strictly follow search engine guidelines, using only ethical, sustainable SEO practices that protect your site from penalties and deliver lasting results." },
          { title: "Technical Excellence", description: "Our technical SEO expertise ensures your site meets every search engine requirement, from Core Web Vitals to structured data and crawl efficiency." },
          { title: "Content-Driven Strategy", description: "We believe great SEO starts with great content. Our approach combines technical optimization with compelling content that earns links and engages visitors." },
          { title: "Transparent Reporting", description: "Detailed monthly reports show exactly where your rankings stand, what work was done, and the measurable impact on traffic and conversions." },
        ],
        timelineItems: [
          { phase: "Month 1", title: "Audit & Foundation", duration: "Technical audit, keyword research, fixes" },
          { phase: "Month 2 to 3", title: "Content & On-Page", duration: "Content optimization, meta tags, structure" },
          { phase: "Month 4 to 5", title: "Authority Building", duration: "Link building, digital PR, citations" },
          { phase: "Ongoing", title: "Monitor & Scale", duration: "Rank tracking, content updates, scaling" },
        ],
        pricingItems: [
          { item: "Technical SEO", description: "Audit, fixes, structured data", amount: "20%" },
          { item: "Content SEO", description: "Keywords, content, on-page optimization", amount: "30%" },
          { item: "Link Building", description: "Outreach, guest posts, authority", amount: "25%" },
          { item: "Local SEO", description: "Google Business, citations, local strategy", amount: "10%" },
          { item: "Monitoring & Reports", description: "Rank tracking, analytics, reports", amount: "15%" },
        ],
      };
    case "custom_development":
      return {
        sectionTitle: "Custom Development Services",
        execSummary: "Our Custom Development service delivers bespoke digital solutions engineered to your exact specifications. From web and mobile applications to complex backend systems, we build high-performance, scalable software that drives your business forward with cutting-edge technology.",
        scopeItems: [
          { title: "UI/UX Design & Prototyping", description: "User research, wireframing, high-fidelity prototyping in Figma, interactive design systems, and user testing to ensure optimal user experience and conversion rates." },
          { title: "Frontend Development", description: "Modern responsive web application development using Next.js, React, TypeScript, and Tailwind CSS with server-side rendering, optimized performance, and mobile-first design approach." },
          { title: "Backend & Database Architecture", description: "Scalable backend development with Node.js, Prisma ORM, PostgreSQL database design, RESTful API development, authentication systems, and cloud infrastructure setup." },
          { title: "Testing, Deployment & DevOps", description: "Comprehensive testing suite, CI/CD pipeline setup, cloud deployment on Vercel/AWS, performance monitoring, SSL setup, and production readiness assurance." },
          { title: "Mobile App Development", description: "Cross-platform mobile application development using React Native, native UI components, push notification integration, and app store deployment for iOS and Android." },
          { title: "API Development & Documentation", description: "RESTful and GraphQL API design and development, comprehensive API documentation with Swagger/OpenAPI, SDK generation, and third-party API integration." },
        ],
        kpis: [
          "Application delivery within agreed project timeline",
          "99.9% uptime after deployment",
          "Page load time under 2 seconds",
          "100% test coverage for critical business logic",
          "Lighthouse performance score of 95+",
          "Comprehensive documentation for all features",
        ],
        approach: [
          { step: "Step 1: Design", title: "Discovery & Design Phase", description: "We start with deep requirement gathering, user research, wireframing, and high-fidelity design to ensure we build exactly what your business needs." },
          { step: "Step 2: Develop", title: "Agile Development & Testing", description: "Using agile sprints, our team develops features iteratively with continuous testing, code reviews, and client demos at each milestone." },
          { step: "Step 3: Deploy", title: "Deployment & Handover", description: "Production deployment with CI/CD pipelines, monitoring setup, knowledge transfer, documentation delivery, and post-launch support." },
        ],
        whyValtriox: [
          { title: "Modern Tech Stack", description: "We use the latest, battle-tested technologies including Next.js, React, TypeScript, PostgreSQL, and cloud-native architecture for future-proof solutions." },
          { title: "Agile Methodology", description: "Our agile development process ensures transparency, flexibility, and continuous delivery, keeping you involved at every stage of development." },
          { title: "Scalable Architecture", description: "Every solution we build is designed to scale, handling increased traffic, users, and features without requiring architectural redesigns." },
          { title: "Clean Code Guarantee", description: "We follow strict code quality standards, comprehensive testing practices, and thorough documentation for maintainable, long-lasting software." },
        ],
        timelineItems: [
          { phase: "Week 1 to 2", title: "Design & Planning", duration: "UI/UX design, prototyping, architecture" },
          { phase: "Week 3 to 6", title: "Development", duration: "Frontend, backend, API development" },
          { phase: "Week 7 to 8", title: "Testing & QA", duration: "Testing, bug fixes, optimization" },
          { phase: "Week 9 to 10", title: "Deployment", duration: "CI/CD, deployment, monitoring, handover" },
        ],
        pricingItems: [
          { item: "Design & UX", description: "UI/UX, prototyping, user testing", amount: "20%" },
          { item: "Frontend Dev", description: "React/Next.js, responsive design", amount: "25%" },
          { item: "Backend & API", description: "Server, database, authentication", amount: "30%" },
          { item: "Testing & QA", description: "Unit tests, integration tests, E2E", amount: "15%" },
          { item: "Deployment & Support", description: "CI/CD, cloud deployment, support", amount: "10%" },
        ],
      };
    case "brand_identity":
      return {
        sectionTitle: "Brand Identity & Design Services",
        execSummary: "Our Brand Identity & Design service creates a distinctive, memorable visual identity that captures the essence of your brand. We craft every visual element with intention and precision, building a cohesive identity system that resonates with your audience and stands the test of time.",
        scopeItems: [
          { title: "Visual Identity System", description: "Complete visual identity design including logo, color palette, typography, iconography, patterns, and comprehensive brand guidelines for consistent visual representation across all touchpoints." },
          { title: "Brand Voice & Messaging", description: "Development of brand personality, tone of voice guidelines, messaging framework, taglines, and communication standards that resonate with your target audience." },
          { title: "Brand Collateral Design", description: "Professional design of business cards, letterheads, presentations, social media templates, email signatures, packaging, and all essential brand collateral materials." },
          { title: "Digital Brand Assets", description: "Website design direction, social media profile optimization, digital ad templates, app icons, and comprehensive digital asset library for all platforms." },
          { title: "Brand Photography Direction", description: "Art direction for brand photography, style guide for image usage, photo editing standards, and visual storytelling guidelines for compelling brand imagery." },
          { title: "Brand Animation & Motion", description: "Logo animation, motion graphics templates, animated social media assets, and video intro/outro designs that bring your brand identity to life in digital media." },
        ],
        kpis: [
          "Complete brand identity delivered within 7 weeks",
          "3 distinct logo concepts presented for selection",
          "100+ brand assets delivered across all formats",
          "Brand guidelines document covering 20+ use cases",
          "Consistent brand application across 10+ touchpoints",
          "Two rounds of revisions included at every stage",
        ],
        approach: [
          { step: "Step 1: Discover", title: "Brand Discovery & Research", description: "We immerse ourselves in your brand through stakeholder interviews, audience research, competitive analysis, and mood boarding to define the creative direction." },
          { step: "Step 2: Design", title: "Concept Development & Refinement", description: "Our designers develop multiple creative concepts, present them for feedback, and refine the selected direction through iterative design reviews until perfection." },
          { step: "Step 3: Deliver", title: "Production & Asset Delivery", description: "We produce all brand assets in every required format, compile comprehensive guidelines, and deliver everything in an organized, production-ready asset library." },
        ],
        whyValtriox: [
          { title: "Award-Winning Design", description: "Our design team brings award-winning creative talent to every project, producing brand identities that stand out and make lasting impressions." },
          { title: "Strategic Creative Process", description: "Our design decisions are guided by strategy, not just aesthetics. Every visual choice serves a business purpose and strengthens your market position." },
          { title: "Comprehensive Asset Library", description: "We deliver a complete asset library covering every format and use case you need, from print to digital, ensuring immediate brand deployment." },
          { title: "Future-Proof Identity", description: "We design brand identities that are timeless and adaptable, built to grow with your brand and remain relevant across evolving media platforms." },
        ],
        timelineItems: [
          { phase: "Week 1 to 2", title: "Discovery & Research", duration: "Brand audit, competitive analysis, audience research" },
          { phase: "Week 3 to 4", title: "Identity Design", duration: "Logo, colors, typography, visual system" },
          { phase: "Week 5 to 6", title: "Asset Creation", duration: "Collateral, digital assets, templates" },
          { phase: "Week 7", title: "Guidelines & Handover", duration: "Brand book, asset delivery, documentation" },
        ],
        pricingItems: [
          { item: "Visual Identity", description: "Logo, colors, typography, visual system", amount: "30%" },
          { item: "Brand Voice", description: "Messaging, tone, communication guidelines", amount: "15%" },
          { item: "Collateral Design", description: "Print & digital brand materials", amount: "25%" },
          { item: "Digital & Motion Assets", description: "Social, web, animation assets", amount: "15%" },
          { item: "Guidelines & Support", description: "Brand book, handover, revisions", amount: "15%" },
        ],
      };
    case "consultation":
      return {
        sectionTitle: "Consultation & Strategy Services",
        execSummary: "Our Consultation & Strategy service provides expert guidance to help your business navigate digital transformation, optimize operations, and achieve sustainable growth. We bring decades of combined experience and proven methodologies to every engagement, delivering actionable insights you can implement immediately.",
        scopeItems: [
          { title: "Business Assessment & Audit", description: "Comprehensive business audit covering operations, technology stack, team structure, processes, and market positioning with detailed findings and actionable recommendations report." },
          { title: "Digital Transformation Strategy", description: "Custom digital transformation roadmap covering technology adoption, process automation, team upskilling, change management, and phased implementation plan with ROI projections." },
          { title: "Growth & Scaling Strategy", description: "Market expansion analysis, customer acquisition strategy, pricing optimization, partnership development, and scalable growth framework with measurable KPIs and milestones." },
          { title: "Operational Excellence", description: "Process optimization, workflow automation recommendations, team productivity enhancement, KPI framework development, and continuous improvement methodology implementation." },
          { title: "Technology Roadmap", description: "Assessment of current technology stack, recommendations for modernization, vendor selection support, and a phased technology adoption roadmap aligned with business goals." },
          { title: "Market & Competitive Intelligence", description: "Deep market analysis, competitor profiling, industry trend identification, opportunity assessment, and strategic positioning recommendations for competitive advantage." },
        ],
        kpis: [
          "Comprehensive assessment report within 2 weeks",
          "Detailed roadmap with 12-month action plan",
          "Identified 15-20 improvement opportunities",
          "ROI projections for each recommended initiative",
          "Prioritized implementation timeline with milestones",
          "Monthly advisory sessions with progress tracking",
        ],
        approach: [
          { step: "Step 1: Assess", title: "Deep-Dive Assessment", description: "We conduct thorough stakeholder interviews, process analysis, technology reviews, and market research to build a complete picture of your business landscape." },
          { step: "Step 2: Strategize", title: "Strategy Development", description: "Using assessment insights, we develop a comprehensive strategy with clear priorities, actionable recommendations, resource requirements, and expected outcomes." },
          { step: "Step 3: Support", title: "Implementation Advisory", description: "We provide ongoing advisory support during implementation, helping your team execute the strategy, overcome challenges, and achieve the defined objectives." },
        ],
        whyValtriox: [
          { title: "C-Level Experience", description: "Our consultants bring senior-level experience from leading organizations, providing insights informed by real-world leadership and strategic decision-making." },
          { title: "Industry Agnostic", description: "We have delivered successful consulting engagements across multiple industries, bringing diverse perspectives and cross-industry best practices." },
          { title: "Actionable Deliverables", description: "Every engagement produces concrete, actionable deliverables, not just recommendations. We provide the tools, frameworks, and plans your team can execute." },
          { title: "Results-Oriented", description: "We define clear success metrics at the start and measure progress throughout the engagement, ensuring our consulting delivers tangible business value." },
        ],
        timelineItems: [
          { phase: "Week 1 to 2", title: "Assessment", duration: "Business audit, stakeholder interviews, analysis" },
          { phase: "Week 3 to 4", title: "Strategy Development", duration: "Strategy document, roadmap, recommendations" },
          { phase: "Week 5 to 6", title: "Implementation Plan", duration: "Action plan, resource allocation, timeline" },
          { phase: "Ongoing", title: "Advisory", duration: "Monthly consulting sessions, progress reviews" },
        ],
        pricingItems: [
          { item: "Business Audit", description: "Comprehensive assessment & findings report", amount: "25%" },
          { item: "Strategy Development", description: "Transformation roadmap & plan", amount: "30%" },
          { item: "Implementation Support", description: "Action plan, resource planning", amount: "20%" },
          { item: "Market Intelligence", description: "Competitor analysis, market research", amount: "10%" },
          { item: "Ongoing Advisory", description: "Monthly sessions, reviews, support", amount: "15%" },
        ],
      };
    case "paid_advertising":
      return {
        sectionTitle: "Paid Advertising Services",
        execSummary: "Our Paid Advertising service delivers high-ROI advertising campaigns across all major platforms. We combine strategic planning, creative excellence, and data-driven optimization to maximize every advertising dollar and deliver measurable business results from day one.",
        scopeItems: [
          { title: "Campaign Strategy & Setup", description: "Strategic campaign planning across Google Ads, Meta Ads, LinkedIn Ads, and TikTok Ads with audience targeting, budget allocation, and conversion tracking setup." },
          { title: "Creative & Ad Production", description: "Professional ad creative development including copywriting, visual design, video ads, carousel ads, and A/B test variants optimized for each platform." },
          { title: "Campaign Management & Optimization", description: "Ongoing campaign monitoring, bid optimization, audience refinement, performance analysis, and data-driven adjustments to maximize ROAS and minimize CPA." },
          { title: "Retargeting & Remarketing", description: "Advanced retargeting strategies including pixel setup, custom audiences, lookalike audiences, and sequential remarketing campaigns for maximum conversion." },
          { title: "Landing Page Optimization", description: "High-converting landing page creation, A/B testing, form optimization, and user experience improvements designed specifically for paid traffic conversion." },
          { title: "Attribution & Reporting", description: "Multi-touch attribution modeling, cross-platform performance analysis, conversion tracking, and detailed weekly reports with optimization recommendations." },
        ],
        kpis: [
          "Return on ad spend (ROAS) of 4x or higher",
          "30-50% reduction in cost per acquisition",
          "Conversion rate improvement of 25% or more",
          "Click-through rate (CTR) above industry benchmarks",
          "Weekly optimization reports with actionable insights",
          "Scaling to 2x ad spend while maintaining ROAS",
        ],
        approach: [
          { step: "Step 1: Plan", title: "Strategy & Audience Research", description: "We define campaign objectives, research target audiences, analyze competitors, develop creative strategies, and set up tracking infrastructure for accurate measurement." },
          { step: "Step 2: Launch", title: "Campaign Launch & Creative Testing", description: "We launch campaigns with multiple creative variants, test audience segments, monitor early performance data, and rapidly iterate on winning combinations." },
          { step: "Step 3: Scale", title: "Optimization & Growth Scaling", description: "We optimize bids, audiences, creative, and landing pages based on performance data, then scale successful campaigns while maintaining efficiency." },
        ],
        whyValtriox: [
          { title: "Platform Certified", description: "Our team holds certifications across Google Ads, Meta Blueprint, LinkedIn Marketing Labs, and TikTok Ads, ensuring expert-level campaign management." },
          { title: "Creative-Driven Performance", description: "We believe great creative is the key to paid advertising success. Our in-house creative team produces scroll-stopping ads that outperform industry benchmarks." },
          { title: "Full-Funnel Strategy", description: "We manage campaigns across the entire funnel, from awareness to conversion, ensuring consistent messaging and optimal budget allocation at every stage." },
          { title: "Transparent ROI Reporting", description: "You get complete visibility into campaign performance, spending, and ROI with clear, actionable reports that show exactly how your investment is performing." },
        ],
        timelineItems: [
          { phase: "Week 1 to 2", title: "Strategy & Setup", duration: "Campaign planning, tracking, pixel setup" },
          { phase: "Week 3 to 4", title: "Launch & Creative", duration: "Ad creation, campaign launch, initial data" },
          { phase: "Week 5 to 8", title: "Optimize & Scale", duration: "A/B testing, optimization, scaling" },
          { phase: "Ongoing", title: "Report & Refine", duration: "Performance reports, strategy refinement" },
        ],
        pricingItems: [
          { item: "Strategy & Setup", description: "Campaign planning, tracking setup", amount: "15%" },
          { item: "Ad Creative", description: "Copywriting, design, video production", amount: "25%" },
          { item: "Campaign Management", description: "Optimization, monitoring, scaling", amount: "35%" },
          { item: "Landing Pages", description: "Creation, A/B testing, optimization", amount: "10%" },
          { item: "Reporting", description: "Analytics, insights, recommendations", amount: "15%" },
        ],
      };
    case "monthly_retainer":
    default:
      return {
        sectionTitle: "Monthly Retainer Services",
        execSummary: "Our Monthly Retainer service provides ongoing access to our expert team for continuous platform support, maintenance, and optimization. With guaranteed response times and dedicated resources, we ensure your digital ecosystem performs at its best around the clock.",
        scopeItems: [
          { title: "Ongoing Technical Support", description: "Priority access to our development team for bug fixes, feature enhancements, performance optimization, and technical consultation with guaranteed response times." },
          { title: "Platform Maintenance", description: "Regular updates, security patches, database optimization, backup management, and infrastructure monitoring for maximum uptime and reliability." },
          { title: "Performance Optimization", description: "Continuous monitoring and optimization of platform performance, load times, database queries, and user experience metrics to deliver the best possible experience." },
          { title: "Monthly Reports & Analytics", description: "Comprehensive monthly reports covering platform health, user analytics, business metrics, and actionable recommendations for continuous improvement." },
          { title: "Feature Development", description: "Monthly development sprint for new features, UI improvements, and functionality enhancements based on your evolving business requirements and user feedback." },
          { title: "Security Monitoring", description: "Continuous security monitoring, vulnerability scanning, intrusion detection, and immediate incident response to protect your platform from threats." },
        ],
        kpis: [
          "99.9% platform uptime guarantee",
          "Response time under 2 hours for critical issues",
          "Monthly performance reports delivered by the 5th",
          "Zero critical security vulnerabilities",
          "10+ hours of development time per month",
          "Proactive issue detection and resolution",
        ],
        approach: [
          { step: "Step 1: Monitor", title: "Continuous Monitoring", description: "We maintain 24/7 monitoring of your platform, tracking performance metrics, security alerts, and system health to detect and address issues proactively." },
          { step: "Step 2: Maintain", title: "Regular Maintenance & Updates", description: "Our team performs scheduled maintenance, applies security patches, optimizes databases, and implements improvements on a regular weekly schedule." },
          { step: "Step 3: Improve", title: "Strategic Optimization", description: "Each month, we analyze performance data, identify optimization opportunities, implement improvements, and deliver a comprehensive report with recommendations." },
        ],
        whyValtriox: [
          { title: "Dedicated Resources", description: "You get a dedicated team assigned to your account, ensuring consistent service quality and deep familiarity with your platform and business needs." },
          { title: "Predictable Costs", description: "Monthly retainer pricing gives you predictable costs with no surprise invoices, making it easy to budget for ongoing platform support and improvement." },
          { title: "Priority Response", description: "Retainer clients receive priority response times, ensuring critical issues are addressed first and business continuity is maintained at all times." },
          { title: "Continuous Improvement", description: "We do not just maintain your platform, we actively improve it each month, ensuring you get better performance and new features over time." },
        ],
        timelineItems: [
          { phase: "Weekly", title: "Support & Maintenance", duration: "Bug fixes, updates, monitoring" },
          { phase: "Bi-Weekly", title: "Optimization Sprint", duration: "Performance tuning, enhancements" },
          { phase: "Monthly", title: "Report & Review", duration: "Analytics report, strategy review" },
          { phase: "Quarterly", title: "Planning Session", duration: "Roadmap review, goal setting" },
        ],
        pricingItems: [
          { item: "Technical Support", description: "Priority bug fixes & consultation", amount: "25%" },
          { item: "Maintenance", description: "Updates, security, backups", amount: "20%" },
          { item: "Feature Development", description: "New features, UI improvements", amount: "25%" },
          { item: "Optimization", description: "Performance & UX improvements", amount: "15%" },
          { item: "Reporting", description: "Analytics, reports, recommendations", amount: "15%" },
        ],
      };
  }
}

function getProposalTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    brand_management: "Brand Management",
    digital_marketing: "Digital Marketing",
    tech_integration: "Technology Integration",
    e_commerce: "E-Commerce Setup",
    enterprise: "Enterprise Solution",
    monthly_retainer: "Monthly Retainer",
    social_media_management: "Social Media Management",
    content_creation: "Content Creation",
    seo_optimization: "SEO Optimization",
    paid_advertising: "Paid Advertising",
    brand_identity: "Brand Identity & Design",
    consultation: "Consultation & Strategy",
    custom_development: "Custom Development",
  };
  return labels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

function drawSectionHeader(doc: any, y: number, title: string, subtitle?: string, W: number, P: number): number {
  const CW = W - P * 2;
  doc.save();
  doc.roundedRect(P, y, 4, 22, 2).fill(C.gold);
  doc.restore();

  doc.font(FONT.bold).fontSize(20).fillColor(C.textPrimary);
  doc.text(title, P + 14, y + 2);

  let newY = y + 28;
  if (subtitle) {
    doc.font(FONT.italic).fontSize(10).fillColor(C.textMuted);
    doc.text(subtitle, P + 14, newY);
    newY += 20;
  }

  goldLine(doc, P, newY + 4, W - P, newY + 4, 0.6);
  return newY + 16;
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

function addPageBg(doc: any, W: number, H: number) {
  doc.rect(0, 0, W, H).fill(C.lightSurface);
  doc.rect(0, 0, W, 3).fill(C.gold);
}

function addConfidentialWatermark(doc: any, W: number, H: number) {
  doc.save();
  doc.rotate(-45, { origin: [W / 2, H / 2] });
  doc.font(FONT.bold).fontSize(52).fillColor(C.watermark);
  doc.opacity(0.04);
  doc.text("CONFIDENTIAL", W / 2 - 200, H / 2 - 20, { width: 400, align: "center" });
  doc.opacity(1);
  doc.restore();
}

function addPageFooter(doc: any, settings: ProposalSettings, W: number, H: number, pageNum: number, totalPages: number, proposalId?: string) {
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
  const rightText = proposalId ? `${settings.companyName} | Proposal ${proposalId}` : `${settings.companyName} | Confidential`;
  doc.text(rightText, 44, footerY + 20, { width: W / 2 - 44 });

  doc.font(FONT.regular).fontSize(7).fillColor(C.textLight);
  doc.text(`Page ${pageNum} of ${totalPages}`, W - 44, footerY + 20, { width: 80, align: "right" });

  doc.rect(0, H - 3, W, 3).fill(C.gold);
}

// ============================================================================
// MAIN: Generate Proposal PDF (Ultra-Premium)
// ============================================================================

export async function generateProposalPDF(
  proposal: ProposalData,
  settings: ProposalSettings
): Promise<Buffer> {
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

    try {
      ensureFontsRegistered(doc);

      const defaultContent = getProposalTypeContent(proposal.type);
      const proposalContent = typeof proposal.content === 'string'
        ? (() => { try { return JSON.parse(proposal.content); } catch { return {}; } })()
        : (proposal.content || {});
      const typeContent = {
        sectionTitle: proposalContent.sectionTitle || defaultContent.sectionTitle,
        scopeItems: (Array.isArray(proposalContent.scopeItems) && proposalContent.scopeItems.length > 0 ? proposalContent.scopeItems : defaultContent.scopeItems),
        kpis: (Array.isArray(proposalContent.kpis) && proposalContent.kpis.length > 0 ? proposalContent.kpis : defaultContent.kpis),
        approach: (Array.isArray(proposalContent.approach) && proposalContent.approach.length > 0 ? proposalContent.approach : defaultContent.approach),
        whyValtriox: (Array.isArray(proposalContent.whyValtriox) && proposalContent.whyValtriox.length > 0 ? proposalContent.whyValtriox : defaultContent.whyValtriox),
        timelineItems: (Array.isArray(proposalContent.timelineItems) && proposalContent.timelineItems.length > 0 ? proposalContent.timelineItems : defaultContent.timelineItems),
        pricingItems: (Array.isArray(proposalContent.pricingItems) && proposalContent.pricingItems.length > 0 ? proposalContent.pricingItems : defaultContent.pricingItems),
        execSummary: proposalContent.execSummary || defaultContent.execSummary,
      };
      const typeLabel = getProposalTypeLabel(proposal.type);

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 1: PREMIUM COVER PAGE
      // ══════════════════════════════════════════════════════════════════════
      doc.addPage();
      addPageBg(doc, W, H);

      // Gold gradient overlay
      doc.save();
      const coverGrad = doc.linearGradient(0, 0, W, H * 0.65);
      coverGrad.stop(0, C.goldBg3);
      coverGrad.stop(0.25, C.goldBg2);
      coverGrad.stop(0.55, C.gold);
      coverGrad.stop(0.85, C.lightSurface);
      coverGrad.stop(1, C.lightSurface);
      doc.rect(0, 0, W, H * 0.65).fill(coverGrad);
      doc.restore();

      // Complete founder logo in an aspect-matched golden frame.
      drawBrandLogoFrameCentered(doc, W / 2, 90, 88, {
        boxHeight: 88 * BRAND_LOGO_ASPECT,
        bgColor: C.white,
        borderColor: C.gold,
        borderWidth: 1.4,
        padding: 0,
      });

      // Company name
      doc.font(FONT.bold).fontSize(38).fillColor(C.textPrimary);
      doc.text(companyName, P, 205, { width: CW, align: "center" });

      // Tagline
      doc.font(FONT.italic).fontSize(13).fillColor(C.goldDim);
      doc.text(tagline, P, 255, { width: CW, align: "center" });

      // Proposal title with gold badge
      doc.font(FONT.bold).fontSize(26).fillColor(C.gold);
      doc.text("PROPOSAL", P, 310, { width: CW, align: "center" });

      // Service type badge
      doc.save();
      const typeLabelW = doc.font(FONT.bold).fontSize(13).widthOfString(typeLabel) + 40;
      doc.roundedRect(W / 2 - typeLabelW / 2, 348, typeLabelW, 30, 8).fill(C.goldBg3);
      doc.roundedRect(W / 2 - typeLabelW / 2, 348, typeLabelW, 30, 8).lineWidth(0.6).strokeColor(C.goldBorder).stroke();
      doc.font(FONT.bold).fontSize(13).fillColor(C.textPrimary);
      doc.text(typeLabel, W / 2 - typeLabelW / 2, 356, { width: typeLabelW, align: "center" });
      doc.restore();

      // Gold divider line
      goldLine(doc, W / 2 - 120, 395, W / 2 + 120, 395, 1.2);

      // Client details section
      let clientY = 415;
      doc.font(FONT.regular).fontSize(11).fillColor(C.textSecondary);
      doc.text("Prepared for:", P, clientY, { width: CW, align: "center" });
      doc.font(FONT.bold).fontSize(15).fillColor(C.textPrimary);
      doc.text(proposal.clientCompany || proposal.clientName, P, clientY + 18, { width: CW, align: "center" });

      // Client contact details card
      const clientDetails: string[] = [];
      if (proposal.clientName) clientDetails.push(proposal.clientName);
      if (proposal.clientEmail) clientDetails.push(proposal.clientEmail);
      if (proposal.clientPhone) clientDetails.push(proposal.clientPhone);
      if (proposal.clientCompany) clientDetails.push(proposal.clientCompany);

      if (clientDetails.length > 0) {
        const detailY = clientY + 42;
        doc.save();
        doc.roundedRect(W / 2 - 130, detailY, 260, 16 + clientDetails.length * 14, 6).fill(C.white);
        doc.roundedRect(W / 2 - 130, detailY, 260, 16 + clientDetails.length * 14, 6).lineWidth(0.4).strokeColor(C.goldBorder).stroke();
        doc.restore();
        let dy = detailY + 6;
        for (const detail of clientDetails) {
          doc.font(FONT.regular).fontSize(8.5).fillColor(C.textMuted);
          doc.text(detail, W / 2 - 120, dy, { width: 240, align: "center" });
          dy += 14;
        }
      }

      // Date & validity
      const currentDate = new Date(proposal.createdAt).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      });
      const dateY = clientDetails.length > 0 ? clientY + 42 + clientDetails.length * 14 + 16 : clientY + 42;
      doc.font(FONT.regular).fontSize(10).fillColor(C.textMuted);
      doc.text(`Date: ${currentDate}`, P, dateY, { width: CW, align: "center" });

      if (proposal.validUntil) {
        const validDate = new Date(proposal.validUntil).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        });
        doc.text(`Valid Until: ${validDate}`, P, dateY + 16, { width: CW, align: "center" });
      }

      // Confidential badge
      const confY = H - 130;
      doc.save();
      doc.lineWidth(0.5);
      doc.roundedRect(W / 2 - 55, confY, 110, 26, 6).fillAndStroke(C.goldBg3, C.goldBorder);
      doc.font(FONT.bold).fontSize(8).fillColor(C.charcoal);
      doc.text("CONFIDENTIAL", W / 2 - 55, confY + 8, { width: 110, align: "center" });
      doc.restore();

      // Contact info at bottom
      let contactY = H - 90;
      const contactParts: string[] = [];
      if (settings.companyEmail) contactParts.push(settings.companyEmail);
      if (settings.companyPhone) contactParts.push(settings.companyPhone);
      if (settings.companyWebsite) contactParts.push(settings.companyWebsite);
      if (contactParts.length > 0) {
        doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
        doc.text(contactParts.join("  |  "), P, contactY, { width: CW, align: "center" });
      }

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 2: TABLE OF CONTENTS
      // ══════════════════════════════════════════════════════════════════════
      doc.addPage();
      addPageBg(doc, W, H);
      addConfidentialWatermark(doc, W, H);

      let y = P + 10;
      y = drawSectionHeader(doc, y, "Table of Contents", "Navigate to the sections that interest you most", W, P);
      y += 8;

      const tocItems = [
        { num: "01", title: "Executive Summary", desc: "Overview of the proposal and key value proposition" },
        { num: "02", title: "Scope of Work", desc: `Detailed breakdown of ${typeLabel} deliverables and services` },
        { num: "03", title: "Our Approach", desc: "Three-step methodology for project execution" },
        { num: "04", title: "Key Performance Indicators", desc: "Measurable outcomes and success metrics" },
        { num: "05", title: "Why Valtriox", desc: "Our differentiators and competitive advantages" },
        { num: "06", title: "Timeline & Milestones", desc: "Project phases, Gantt chart, and delivery schedule" },
        { num: "07", title: "Pricing & Investment", desc: "Transparent pricing breakdown and payment structure" },
        { num: "08", title: "Terms & Conditions", desc: "Project terms, payment schedule, and agreement details" },
        { num: "09", title: "Acceptance & Signature", desc: "Proposal acceptance and authorization section" },
      ];

      for (const item of tocItems) {
        drawCard(doc, P, y, CW, 50);

        doc.save();
        doc.roundedRect(P + 12, y + 13, 28, 24, 5).fill(C.goldBg3);
        doc.roundedRect(P + 12, y + 13, 28, 24, 5).lineWidth(0.5).strokeColor(C.goldBorder).stroke();
        doc.font(FONT.bold).fontSize(11).fillColor(C.gold);
        doc.text(item.num, P + 12, y + 20, { width: 28, align: "center" });
        doc.restore();

        doc.font(FONT.bold).fontSize(11).fillColor(C.textPrimary);
        doc.text(item.title, P + 50, y + 10, { width: CW - 60 });

        doc.font(FONT.regular).fontSize(8).fillColor(C.textMuted);
        doc.text(item.desc, P + 50, y + 26, { width: CW - 60 });

        y += 58;
      }

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 3: EXECUTIVE SUMMARY
      // ══════════════════════════════════════════════════════════════════════
      doc.addPage();
      addPageBg(doc, W, H);
      addConfidentialWatermark(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, "Executive Summary", "A brief overview of this proposal", W, P);

      drawCard(doc, P, y, CW, 180);
      doc.font(FONT.regular).fontSize(10.5).fillColor(C.textSecondary);
      doc.text(`Dear ${proposal.clientName},`, P + 18, y + 16, { width: CW - 36, lineGap: 3 });

      const customExecSummary = proposalContent.execSummary;
      const summaryParagraphs = customExecSummary
        ? [customExecSummary]
        : [
            `Thank you for choosing ${companyName} as your partner. We are pleased to present this proposal for ${typeLabel.toLowerCase()} services tailored specifically for ${proposal.clientCompany || "your organization"}.`,
            `Our team has carefully analyzed your requirements and developed a comprehensive strategy that aligns with your business goals. This proposal outlines our recommended approach, timeline, deliverables, and investment.`,
            `With ${companyName}'s expertise in ${typeLabel.toLowerCase()}, we are confident in our ability to deliver exceptional results that drive measurable growth and long-term success for your brand.`,
          ];
      let sy = y + 34;
      for (const para of summaryParagraphs) {
        doc.text(para, P + 18, sy, { width: CW - 36, lineGap: 3 });
        sy += doc.heightOfString(para, { width: CW - 36, lineGap: 3 }) + 10;
      }
      y += 196;

      y = ensureSpace(doc, y, 160, W, H, P);
      drawCard(doc, P, y, CW, 140);
      doc.font(FONT.bold).fontSize(11).fillColor(C.textPrimary);
      doc.text("Key Highlights", P + 18, y + 12, { width: CW - 36 });

      const highlights = [
        "Tailored solution designed specifically for your business needs",
        "Experienced team with proven track record in " + typeLabel.toLowerCase(),
        "Transparent pricing with no hidden costs",
        "Regular progress updates and milestone reviews",
        "30-day post-delivery support included",
        "Dedicated project manager assigned to your account",
      ];
      let hy = y + 32;
      for (const h of highlights) {
        doc.save();
        doc.circle(P + 26, hy + 4, 2.5).fill(C.gold);
        doc.restore();
        doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
        doc.text(h, P + 36, hy - 2, { width: CW - 54 });
        hy += 16;
      }

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 4: SCOPE OF WORK
      // ══════════════════════════════════════════════════════════════════════
      doc.addPage();
      addPageBg(doc, W, H);
      addConfidentialWatermark(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, "Scope of Work", typeLabel + " - Detailed deliverables", W, P);
      y += 4;

      for (const item of typeContent.scopeItems) {
        y = ensureSpace(doc, y, 80, W, H, P);

        // Calculate dynamic height based on description text
        const descHeight = doc.font(FONT.regular).fontSize(8.5).heightOfString(item.description, { width: CW - 46, lineGap: 2 });
        const cardH = Math.max(62, descHeight + 42);

        drawCard(doc, P, y, CW, cardH);

        // Gold left border accent (#D4A73A)
        doc.save();
        doc.roundedRect(P, y, 4, cardH, 2).fill(C.gold);
        doc.restore();

        // Subtle inner highlight line
        doc.save();
        doc.roundedRect(P + 4, y, 1, cardH, 0).fill(C.goldBorder);
        doc.restore();

        doc.font(FONT.bold).fontSize(11).fillColor(C.gold);
        doc.text(item.title, P + 16, y + 12, { width: CW - 46 });

        doc.font(FONT.regular).fontSize(8.5).fillColor(C.textSecondary);
        doc.text(item.description, P + 16, y + 30, { width: CW - 46, lineGap: 2.5 });

        y += cardH + 8;
      }

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 5: OUR APPROACH
      // ══════════════════════════════════════════════════════════════════════
      doc.addPage();
      addPageBg(doc, W, H);
      addConfidentialWatermark(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, "Our Approach", "Three-step methodology for delivering excellence", W, P);
      y += 4;

      const approachItems = typeContent.approach || [];
      for (let i = 0; i < approachItems.length; i++) {
        const item = approachItems[i];
        y = ensureSpace(doc, y, 100, W, H, P);
        drawCard(doc, P, y, CW, 90);

        // Step number circle
        doc.save();
        doc.circle(P + 32, y + 26, 16).fill(C.gold);
        doc.font(FONT.bold).fontSize(12).fillColor(C.white);
        doc.text(String(i + 1), P + 32 - 8, y + 20, { width: 16, align: "center" });
        doc.restore();

        // Connector line
        if (i < approachItems.length - 1) {
          doc.save();
          doc.moveTo(P + 32, y + 42).lineTo(P + 32, y + 90).lineWidth(1.5).strokeColor(C.goldBorder).stroke();
          doc.restore();
        }

        doc.font(FONT.bold).fontSize(12).fillColor(C.textPrimary);
        doc.text(item.title, P + 58, y + 12, { width: CW - 74 });

        doc.font(FONT.bold).fontSize(9).fillColor(C.gold);
        doc.text(item.step, P + 58, y + 28, { width: CW - 74 });

        doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
        doc.text(item.description, P + 58, y + 42, { width: CW - 74, lineGap: 2 });

        y += 100;
      }

      // ══════════════════════════════════════════════════════════════════════
      // PAGE 6: KPIs & DELIVERABLES
      // ══════════════════════════════════════════════════════════════════════
      doc.addPage();
      addPageBg(doc, W, H);
      addConfidentialWatermark(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, "Key Performance Indicators", "Measurable outcomes and success metrics", W, P);
      y += 4;

      const kpis = typeContent.kpis || [];
      const kpiCardH = kpis.length * 36 + 28;
      drawCard(doc, P, y, CW, kpiCardH);
      doc.font(FONT.bold).fontSize(11).fillColor(C.textPrimary);
      doc.text("Expected Deliverables & Success Metrics", P + 18, y + 14, { width: CW - 36 });

      let kpiY = y + 36;
      for (let kpiIdx = 0; kpiIdx < kpis.length; kpiIdx++) {
        const kpi = kpis[kpiIdx];

        // Numbered gold circle for KPI
        doc.save();
        doc.circle(P + 28, kpiY + 7, 9).fill(C.gold);
        doc.font(FONT.bold).fontSize(8).fillColor(C.white);
        doc.text(String(kpiIdx + 1), P + 28 - 6, kpiY + 3, { width: 12, align: "center" });
        doc.restore();

        doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
        doc.text(kpi, P + 44, kpiY + 1, { width: CW - 66, lineGap: 1.5 });
        kpiY += 36;
      }
      y += kpiCardH + 12;

      // ══════════════════════════════════════════════════════════════════════
      // WHY VALTRIOX
      // ══════════════════════════════════════════════════════════════════════
      y = ensureSpace(doc, y, 40, W, H, P);
      y = drawSectionHeader(doc, y, "Why Valtriox", "Our differentiators and competitive advantages", W, P);
      y += 4;

      const whyItems = typeContent.whyValtriox || [];
      const cols = 2;
      const colW = (CW - 12) / cols;
      for (let i = 0; i < whyItems.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cardX = P + col * (colW + 12);
        const cardY = y + row * 80;

        if (cardY + 72 > H - 80) {
          doc.addPage();
          addPageBg(doc, W, H);
          addConfidentialWatermark(doc, W, H);
          y = P + 10;
          const adjRow = row - Math.floor((H - 80 - y) / 80);
          // Recalculate
        }

        drawCard(doc, cardX, cardY, colW, 72);

        // Gold accent dot
        doc.save();
        doc.circle(cardX + 18, cardY + 18, 5).fill(C.gold);
        doc.font(FONT.bold).fontSize(8).fillColor(C.white);
        doc.text(String(i + 1), cardX + 18 - 5, cardY + 14, { width: 10, align: "center" });
        doc.restore();

        doc.font(FONT.bold).fontSize(10).fillColor(C.textPrimary);
        doc.text(whyItems[i].title, cardX + 30, cardY + 12, { width: colW - 42 });

        doc.font(FONT.regular).fontSize(8).fillColor(C.textSecondary);
        doc.text(whyItems[i].description, cardX + 30, cardY + 28, { width: colW - 42, lineGap: 1.5 });
      }

      y += Math.ceil(whyItems.length / cols) * 80 + 8;

      // ══════════════════════════════════════════════════════════════════════
      // TIMELINE & GANTT CHART
      // ══════════════════════════════════════════════════════════════════════
      doc.addPage();
      addPageBg(doc, W, H);
      addConfidentialWatermark(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, "Timeline & Milestones", "Project phases and Gantt chart visualization", W, P);
      y += 4;

      // Gantt-style timeline chart
      const timelineItems = typeContent.timelineItems;
      const ganttStartX = P + 100;
      const ganttW = CW - 110;
      const rowH = 32;
      const ganttHeaderH = 30;

      drawCard(doc, P, y, CW, timelineItems.length * rowH + ganttHeaderH + 24);

      // Header
      doc.save();
      doc.roundedRect(P + 10, y + 10, CW - 20, ganttHeaderH, 4).fill(C.goldBg3);
      doc.font(FONT.bold).fontSize(8).fillColor(C.goldDim);
      doc.text("PHASE", P + 18, y + 18, { width: 78 });
      doc.text("GANTT CHART", ganttStartX, y + 18, { width: ganttW });
      doc.restore();

      // Calculate total phases for proportional bars
      const totalPhases = timelineItems.length;
      let gY = y + ganttHeaderH + 14;

      for (let i = 0; i < timelineItems.length; i++) {
        const item = timelineItems[i];

        // Alternating background color for timeline rows
        if (i % 2 === 1) {
          doc.save();
          doc.roundedRect(P + 10, gY - 2, CW - 20, rowH, 3).fill(C.goldBg2);
          doc.restore();
        }

        // Row separator
        if (i > 0) {
          goldLine(doc, P + 14, gY, CW - 14, gY, 0.2);
        }

        // Phase label
        doc.save();
        const badgeW = Math.max(doc.font(FONT.bold).fontSize(7).widthOfString(item.phase) + 14, 56);
        doc.roundedRect(P + 16, gY + 4, badgeW, 18, 3).fill(C.gold);
        doc.font(FONT.bold).fontSize(7).fillColor(C.white);
        doc.text(item.phase, P + 16, gY + 9, { width: badgeW, align: "center" });
        doc.restore();

        // Title next to badge
        doc.font(FONT.bold).fontSize(8).fillColor(C.textPrimary);
        doc.text(item.title, P + 16, gY + 24, { width: 82 });

        // Gantt bar - proportional width based on phase
        const barStart = (i / totalPhases) * ganttW;
        const barWidth = (1 / totalPhases) * ganttW * 0.85;
        const barX = ganttStartX + barStart + 4;
        const barY = gY + 6;

        doc.save();
        doc.roundedRect(barX, barY, barWidth, 14, 3).fill(C.goldMid);
        doc.roundedRect(barX, barY, barWidth, 14, 3).lineWidth(0.4).strokeColor(C.gold).stroke();
        doc.font(FONT.bold).fontSize(6).fillColor(C.darkPremium);
        doc.text(item.duration, barX + 4, barY + 4, { width: barWidth - 8, align: "center" });
        doc.restore();

        gY += rowH;
      }

      y += timelineItems.length * rowH + ganttHeaderH + 40;

      // Milestone notes
      y = ensureSpace(doc, y, 100, W, H, P);
      drawCard(doc, P, y, CW, 80);
      doc.font(FONT.bold).fontSize(10).fillColor(C.textPrimary);
      doc.text("Project Milestones", P + 18, y + 12, { width: CW - 36 });

      const milestones = [
        "Kick-off meeting upon proposal acceptance",
        "Weekly progress updates and status reports",
        "Milestone review meetings at each phase completion",
        "Final delivery with comprehensive documentation",
        "30-day post-delivery support period",
      ];
      let my = y + 30;
      for (const m of milestones) {
        doc.font(FONT.regular).fontSize(8.5).fillColor(C.textSecondary);
        doc.circle(P + 26, my + 4, 2.5).fill(C.green);
        doc.text(m, P + 36, my - 2, { width: CW - 54 });
        my += 13;
      }

      // ══════════════════════════════════════════════════════════════════════
      // PRICING & INVESTMENT
      // ══════════════════════════════════════════════════════════════════════
      doc.addPage();
      addPageBg(doc, W, H);
      addConfidentialWatermark(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, "Pricing & Investment", "Transparent pricing breakdown", W, P);
      y += 4;

      // Pricing table - clean two-column layout
      const tableH = typeContent.pricingItems.length * 40 + 120;
      drawCard(doc, P, y, CW, tableH);

      // Table header
      doc.save();
      doc.roundedRect(P + 10, y + 10, CW - 20, 24, 4).fill(C.goldBg3);
      doc.font(FONT.bold).fontSize(8).fillColor(C.goldDim);
      doc.text("SERVICE & DESCRIPTION", P + 20, y + 17, { width: CW - 100 });
      doc.text("ALLOCATION", CW - 80, y + 17, { width: 60, align: "right" });
      doc.restore();

      let py = y + 40;
      for (let pricingIdx = 0; pricingIdx < typeContent.pricingItems.length; pricingIdx++) {
        const item = typeContent.pricingItems[pricingIdx];

        // Alternating subtle background for pricing rows
        if (pricingIdx % 2 === 1) {
          doc.save();
          doc.roundedRect(P + 10, py - 2, CW - 20, 36, 2).fill(C.goldBg);
          doc.restore();
        }

        goldLine(doc, P + 20, py, CW - 20, py, 0.3);

        // Left column: item name + description
        doc.font(FONT.bold).fontSize(9).fillColor(C.textPrimary);
        doc.text(item.item, P + 20, py + 5, { width: CW - 100 });

        doc.font(FONT.regular).fontSize(7.5).fillColor(C.textMuted);
        doc.text(item.description, P + 20, py + 18, { width: CW - 100 });

        // Right column: percentage allocation in gold pill
        const amtW = Math.max(doc.font(FONT.bold).fontSize(9).widthOfString(item.amount) + 16, 36);
        const amtX = CW - 20 - amtW;
        doc.save();
        doc.roundedRect(amtX, py + 6, amtW, 18, 4).fill(C.goldBg3);
        doc.roundedRect(amtX, py + 6, amtW, 18, 4).lineWidth(0.4).strokeColor(C.goldBorder).stroke();
        doc.font(FONT.bold).fontSize(9).fillColor(C.gold);
        doc.text(item.amount, amtX, py + 10, { width: amtW, align: "center" });
        doc.restore();

        py += 40;
      }

      // Subtotal line
      const subtotalY = py + 8;
      goldLine(doc, P + 20, subtotalY - 4, CW - 20, subtotalY - 4, 0.8);

      if (proposal.totalCost != null) {
        const subtotal = proposal.totalCost;
        const taxRate = 0.0;
        const tax = Math.round(subtotal * taxRate);
        const total = subtotal + tax;

        doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
        doc.text("Subtotal", P + 20, subtotalY, { width: CW - 120 });
        doc.font(FONT.regular).fontSize(9).fillColor(C.textPrimary);
        doc.text(`${proposal.currencySymbol} ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, CW - 80, subtotalY, { width: 60, align: "right" });

        const taxY = subtotalY + 16;
        doc.font(FONT.regular).fontSize(9).fillColor(C.textSecondary);
        doc.text("Tax (if applicable)", P + 20, taxY, { width: CW - 120 });
        doc.font(FONT.regular).fontSize(9).fillColor(C.textPrimary);
        doc.text(`${proposal.currencySymbol} ${tax.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, CW - 80, taxY, { width: 60, align: "right" });

        const totalY = subtotalY + 32;
        goldLine(doc, P + 20, totalY - 4, CW - 20, totalY - 4, 0.8);

        doc.font(FONT.bold).fontSize(12).fillColor(C.textPrimary);
        doc.text("Total Investment", P + 20, totalY, { width: CW - 120 });

        doc.font(FONT.bold).fontSize(14).fillColor(C.gold);
        doc.text(
          `${proposal.currencySymbol} ${total.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
          CW - 80, totalY - 2, { width: 60, align: "right" }
        );
      } else {
        doc.font(FONT.bold).fontSize(11).fillColor(C.textPrimary);
        doc.text("Total Investment", P + 20, subtotalY, { width: CW - 120 });
        doc.font(FONT.bold).fontSize(13).fillColor(C.gold);
        doc.text("To Be Discussed", CW - 80, subtotalY - 2, { width: 60, align: "right" });
      }

      y += tableH + 16;

      // Payment terms
      y = ensureSpace(doc, y, 100, W, H, P);
      drawCard(doc, P, y, CW, 90);
      doc.font(FONT.bold).fontSize(10).fillColor(C.textPrimary);
      doc.text("Payment Structure", P + 18, y + 12, { width: CW - 36 });

      const paymentTerms = [
        "50% advance upon proposal acceptance and project initiation",
        "25% upon completion of 50% of deliverables",
        "25% upon final delivery and project sign-off",
        "All payments due within 15 business days of invoice date",
      ];
      let payY = y + 32;
      for (const pt of paymentTerms) {
        doc.font(FONT.regular).fontSize(8.5).fillColor(C.textSecondary);
        doc.circle(P + 26, payY + 4, 2).fill(C.gold);
        doc.text(pt, P + 36, payY - 2, { width: CW - 54 });
        payY += 13;
      }

      // ══════════════════════════════════════════════════════════════════════
      // TERMS & CONDITIONS
      // ══════════════════════════════════════════════════════════════════════
      doc.addPage();
      addPageBg(doc, W, H);
      addConfidentialWatermark(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, "Terms & Conditions", "Project agreement and terms of service", W, P);
      y += 4;

      const customTerms = proposalContent.customTerms;
      const terms = customTerms
        ? [{ title: "Custom Terms & Conditions", text: customTerms }]
        : [
            { title: "1. Agreement", text: "This proposal constitutes an offer by " + companyName + " to provide the services described herein. Upon written acceptance by the client, this proposal becomes a binding agreement between both parties." },
            { title: "2. Scope Changes", text: "Any changes to the scope of work described in this proposal will require a formal change order. Additional costs and timeline adjustments resulting from scope changes will be documented and approved by both parties before implementation." },
            { title: "3. Intellectual Property", text: "Upon full payment, all deliverables created specifically for the client under this agreement shall be transferred to the client. " + companyName + " retains the right to use general knowledge, skills, and experience gained during the project." },
            { title: "4. Confidentiality", text: "Both parties agree to maintain strict confidentiality regarding all proprietary information exchanged during the course of this engagement. This obligation remains in effect for a period of two (2) years following project completion." },
            { title: "5. Project Validity", text: proposal.validUntil ? `This proposal is valid until ${new Date(proposal.validUntil).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}. After this date, prices and availability may be subject to change.` : "This proposal is valid for 30 days from the date of issue. After this period, prices and availability may be subject to change." },
            { title: "6. Cancellation", text: "Either party may cancel this agreement with 14 days written notice. In the event of cancellation by the client, work completed to date will be invoiced proportionally." },
            { title: "7. Limitation of Liability", text: "In no event shall " + companyName + " be liable for any indirect, incidental, special, or consequential damages arising from the services provided under this agreement." },
            { title: "8. Governing Law", text: "This agreement shall be governed by and construed in accordance with the laws of Pakistan. Any disputes arising under this agreement shall be resolved through amicable negotiation or binding arbitration." },
          ];

      for (const term of terms) {
        y = ensureSpace(doc, y, 48, W, H, P);
        drawCard(doc, P, y, CW, 42);

        doc.font(FONT.bold).fontSize(9).fillColor(C.gold);
        doc.text(term.title, P + 16, y + 6, { width: CW - 32 });

        doc.font(FONT.regular).fontSize(8).fillColor(C.textSecondary);
        doc.text(term.text, P + 16, y + 20, { width: CW - 32, lineGap: 1.5 });

        y += 50;
      }

      // ══════════════════════════════════════════════════════════════════════
      // ACCEPTANCE & SIGNATURE SECTION
      // ══════════════════════════════════════════════════════════════════════
      doc.addPage();
      addPageBg(doc, W, H);
      addConfidentialWatermark(doc, W, H);

      y = P + 10;
      y = drawSectionHeader(doc, y, "Proposal Acceptance", "Please sign below to accept this proposal", W, P);
      y += 4;

      // Acceptance text
      drawCard(doc, P, y, CW, 80);
      doc.font(FONT.regular).fontSize(10).fillColor(C.textSecondary);
      const acceptText = `By signing below, you acknowledge that you have read, understood, and agree to the terms, conditions, and scope of work outlined in this proposal. This acceptance constitutes authorization for ${companyName} to begin work on the project as described herein.`;
      doc.text(acceptText, P + 18, y + 16, { width: CW - 36, lineGap: 3 });
      y += 96;

      // Signature boxes - two columns
      const sigBoxW = (CW - 20) / 2;
      const sigBoxH = 150;

      // Client signature
      drawCard(doc, P, y, sigBoxW, sigBoxH);
      doc.font(FONT.bold).fontSize(10).fillColor(C.textPrimary);
      doc.text("Client Signature", P + 16, y + 12, { width: sigBoxW - 32 });

      doc.font(FONT.regular).fontSize(8).fillColor(C.textMuted);
      doc.text("Name:", P + 16, y + 32);
      goldLine(doc, P + 16, y + 50, P + sigBoxW - 16, y + 50, 0.5);

      doc.text("Title:", P + 16, y + 62);
      goldLine(doc, P + 16, y + 80, P + sigBoxW - 16, y + 80, 0.5);

      doc.text("Signature:", P + 16, y + 92);
      goldLine(doc, P + 16, y + 110, P + sigBoxW - 16, y + 110, 0.5);

      doc.text("Date:", P + 16, y + 122);
      goldLine(doc, P + 16, y + 140, P + sigBoxW - 16, y + 140, 0.5);

      // Company signature
      drawCard(doc, P + sigBoxW + 20, y, sigBoxW, sigBoxH);
      doc.font(FONT.bold).fontSize(10).fillColor(C.textPrimary);
      doc.text("Company Representative", P + sigBoxW + 36, y + 12, { width: sigBoxW - 52 });

      doc.font(FONT.regular).fontSize(8).fillColor(C.textMuted);
      doc.text("Name:", P + sigBoxW + 36, y + 32);
      goldLine(doc, P + sigBoxW + 36, y + 50, P + CW - 16, y + 50, 0.5);

      doc.text("Title:", P + sigBoxW + 36, y + 62);
      goldLine(doc, P + sigBoxW + 36, y + 80, P + CW - 16, y + 80, 0.5);

      doc.text("Signature:", P + sigBoxW + 36, y + 92);
      goldLine(doc, P + sigBoxW + 36, y + 110, P + CW - 16, y + 110, 0.5);

      doc.text("Date:", P + sigBoxW + 36, y + 122);
      goldLine(doc, P + sigBoxW + 36, y + 140, P + CW - 16, y + 140, 0.5);

      y += sigBoxH + 20;

      // ══════════════════════════════════════════════════════════════════════
      // CONTACT INFORMATION
      // ══════════════════════════════════════════════════════════════════════
      y = ensureSpace(doc, y, 40, W, H, P);
      y = drawSectionHeader(doc, y, "Contact Information", "We would love to hear from you", W, P);
      y += 4;

      drawCard(doc, P, y, CW, 160);

      let cy = y + 16;
      doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
      doc.text("EMAIL", P + 20, cy);
      doc.font(FONT.regular).fontSize(12).fillColor(C.gold);
      doc.text(settings.companyEmail || "N/A", P + 20, cy + 12);
      cy += 34;

      if (settings.companyPhone) {
        doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
        doc.text("PHONE", P + 20, cy);
        doc.font(FONT.regular).fontSize(12).fillColor(C.textPrimary);
        doc.text(settings.companyPhone, P + 20, cy + 12);
        cy += 34;
      }

      if (settings.whatsappNumber) {
        doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
        doc.text("WHATSAPP", P + 20, cy);
        doc.font(FONT.regular).fontSize(12).fillColor(C.green);
        doc.text(settings.whatsappNumber, P + 20, cy + 12);
        cy += 34;
      }

      if (settings.companyWebsite) {
        doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
        doc.text("WEBSITE", P + 20, cy);
        doc.font(FONT.regular).fontSize(12).fillColor(C.gold);
        doc.text(settings.companyWebsite, P + 20, cy + 12);
        cy += 34;
      }

      if (settings.companyAddress) {
        doc.font(FONT.bold).fontSize(8).fillColor(C.textMuted);
        doc.text("ADDRESS", P + 20, cy);
        doc.font(FONT.regular).fontSize(10).fillColor(C.textPrimary);
        doc.text(settings.companyAddress, P + 20, cy + 12, { width: CW - 40 });
      }

      y += 176;

      // CTA
      const ctaY = Math.max(y + 10, H - 80);
      if (ctaY + 50 <= H - 45) {
        doc.save();
        doc.roundedRect(W / 2 - 150, ctaY, 300, 48, 10).fill(C.gold);
        doc.font(FONT.bold).fontSize(14).fillColor(C.white);
        doc.text("Ready to Get Started?", W / 2 - 150, ctaY + 10, { width: 300, align: "center" });
        doc.font(FONT.regular).fontSize(9).fillColor(C.white);
        doc.text(
          settings.companyWebsite ? settings.companyWebsite : settings.companyEmail || "Contact us today",
          W / 2 - 150, ctaY + 30, { width: 300, align: "center" }
        );
        doc.restore();
      }

      // ── END: Add page numbers and watermarks to all pages ──
      const totalPages = doc.bufferedPageRange().count;

      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        // Skip cover page watermark (page 0)
        if (i > 0) {
          addConfidentialWatermark(doc, W, H);
        }
        addPageFooter(doc, settings, W, H, i + 1, totalPages, proposal.id);
      }

      doc.end();
    } catch (err) {
      hasErrored = true;
      reject(err);
    }
  });
}
