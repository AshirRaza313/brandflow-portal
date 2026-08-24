import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return collectSourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const landingDirectory = resolve(process.cwd(), "src/components/brandflow/landing");
const legalDirectory = resolve(process.cwd(), "src/components/brandflow/legal");
const publicMarketingFiles = [
  ...collectSourceFiles(landingDirectory),
  ...collectSourceFiles(legalDirectory),
  resolve(process.cwd(), "src/app/about/page.tsx"),
  resolve(process.cwd(), "src/app/contact/page.tsx"),
  resolve(process.cwd(), "src/app/beta-claim/layout.tsx"),
  resolve(process.cwd(), "src/app/beta-claim/BetaClaimContent.tsx"),
  resolve(process.cwd(), "src/app/layout.tsx"),
  resolve(process.cwd(), "src/app/api/subscriptions/plans/route.ts"),
  resolve(process.cwd(), "src/app/api/leads/route.ts"),
  resolve(process.cwd(), "src/components/brandflow/onboarding/PlanSelectionOverlay.tsx"),
  resolve(process.cwd(), "src/lib/lead-magnet-generator.ts"),
  resolve(process.cwd(), "src/lib/public-lead-magnet.ts"),
  resolve(process.cwd(), "src/app/api/lead-magnet/route.ts"),
  resolve(process.cwd(), "scripts/generate-public-lead-magnet.ts"),
  resolve(process.cwd(), "src/lib/platform-identity.tsx"),
  resolve(process.cwd(), "public/manifest.json"),
];

const forbiddenClaims = [
  {
    label: "unsupported aggregate adoption count",
    pattern: /(?:\b\d[\d,]*\+|\bover\s+\d[\d,]*|\bhundreds\s+of)\s+(?:brands|businesses|users|customers|clients|companies|teams)\b/i,
  },
  {
    label: "unsupported market-leader claim",
    pattern: /Pakistan(?:'|’)s leading brand management platform/i,
  },
  {
    label: "unsupported customer rating",
    pattern: /\b4\.8\s*\/\s*5(?:\.0)?\b|aggregateRating|reviewCount/i,
  },
  {
    label: "fabricated named testimonial",
    pattern: /Lahore Fabric House|Karachi Food Bazaar|Islamabad Tech Store|Multan Craft Emporium/i,
  },
  {
    label: "unsupported outcome claim",
    pattern: /15 ghante|40% waste|business growth 3x|\+(?:45|50|60|200)%/i,
  },
  {
    label: "unsupported popularity or market-leader claim",
    pattern: /Most Popular|Pakistan(?:'|’)s premier brand management portal/i,
  },
  {
    label: "unverified security, performance, or availability claim",
    pattern: /Enterprise-grade (?:security|tooling)|standards a bank would use|under 200 milliseconds|slow 3G|GDPR-compliant|AES-256|TLS 1\.3|SOC 2 Type II|99\.99% Uptime SLA/i,
  },
  {
    label: "contradictory free-beta offer",
    pattern: /Free for Early Adopters/i,
  },
  {
    label: "unsupported support-response or absolute reliability promise",
    pattern: /24\/7 Customer Support|(?:get an |\b)instant response|does not break when you grow/i,
  },
  {
    label: "unverified AI, forecast, or automated recommendation availability",
    pattern: /AI-Powered Insights|daily briefings|sales forecasts|recommendations powered by AI|AI restock predictions|AI content writer|AI Built Into The Workflow|predictive analytics|revenue forecasting|Full Suite AI Dashboard/i,
  },
  {
    label: "unverified live synchronization or integration availability",
    pattern: /real-time sync|integrates with (?:WooCommerce|Shopify)|WhatsApp Business API integration|Multi-channel Integration|Full API(?: Access| \+ Webhooks)/i,
  },
  {
    label: "unbounded plan or support promise",
    pattern: /Priority 24\/7 Support|Unlimited (?:Everything|Invoices|Orders|Products|Orders & Products|Team Members|Team Management|Marketing Power)|Dedicated Account Manager/i,
  },
  {
    label: "unsupported free offer",
    pattern: /completely free during beta|14-Day Free Trial|Free 30-minute|Free Consultation|Free Walkthrough|Download Free Guide|Email Sent with Free Guide/i,
  },
  {
    label: "contact delivery or response guarantee",
    pattern: /within 24 hours|received successfully|has been sent to your (?:email|inbox)|we(?:'|&apos;)ve sent you/i,
  },
  {
    label: "unsupported native or offline application claim",
    pattern: /\bPWA\b|offline support|runs like a native app|Installable On Any Phone/i,
  },
  {
    label: "unverified physical, global, payment, or site-search metadata",
    pattern: /paymentAccepted|areaServed[^\n]*Worldwide|Made in Pakistan for the world|SearchAction|\bVisit Us\b|headquartered in Karachi|#localbusiness/i,
  },
  {
    label: "uncontracted public SLA",
    pattern: /99\.(?:5|9|99)%|Uptime Commitment|Credit for Downtime/i,
  },
  {
    label: "unverified privacy operations",
    pattern: /regular security audits|secure data backup|employee training on data protection/i,
  },
  {
    label: "unimplemented trial notification or post-trial mode",
    pattern: /reminder notifications at 7 days|read-only mode for 30 days/i,
  },
  {
    label: "whole-business or operating-system absolute",
    pattern: /Run Your Entire Brand|entire operating system for running a brand/i,
  },
  {
    label: "unverified social metadata handle",
    pattern: /(?:creator|site):\s*["']@valtriox["']/i,
  },
];

describe("public beta marketing claims", () => {
  it.each(forbiddenClaims)("does not publish $label", ({ pattern }) => {
    const violations = publicMarketingFiles
      .filter((file) => pattern.test(readFileSync(file, "utf8")))
      .map((file) => relative(process.cwd(), file));

    expect(violations).toEqual([]);
  });

  it("states the beta posture and evidence policy explicitly", () => {
    const about = readFileSync(
      resolve(process.cwd(), "src/components/brandflow/landing/About.tsx"),
      "utf8",
    );
    const earlyAccess = readFileSync(
      resolve(process.cwd(), "src/components/brandflow/landing/Testimonials.tsx"),
      "utf8",
    );

    expect(about).toContain("invite-only beta");
    expect(earlyAccess).toContain("Verified customer stories will be published only with permission and supporting evidence.");
  });

  it("publishes only real footer destinations", () => {
    const footer = readFileSync(
      resolve(process.cwd(), "src/components/brandflow/landing/Footer.tsx"),
      "utf8",
    );

    expect(footer).not.toMatch(/"(?:Changelog|Documentation|Blog|Careers|Press|Partners|Community|Status|API Docs)"/);
    expect(footer).toContain('"Contact": "/contact"');
  });

  it("qualifies beta plan, connector, and contact terms", () => {
    const pricing = readFileSync(
      resolve(process.cwd(), "src/components/brandflow/landing/Pricing.tsx"),
      "utf8",
    );
    const faq = readFileSync(
      resolve(process.cwd(), "src/components/brandflow/landing/FAQ.tsx"),
      "utf8",
    );
    const contact = readFileSync(
      resolve(process.cwd(), "src/components/brandflow/landing/ContactPage.tsx"),
      "utf8",
    );

    expect(pricing).toContain("confirmed before activation");
    expect(faq).toContain("not a promise that a live third-party connection is enabled");
    expect(contact).toContain("Follow-up timing varies");
  });

  it("keeps public plan sources aligned with reviewed beta terms", () => {
    const planApi = readFileSync(
      resolve(process.cwd(), "src/app/api/subscriptions/plans/route.ts"),
      "utf8",
    );
    const overlay = readFileSync(
      resolve(process.cwd(), "src/components/brandflow/onboarding/PlanSelectionOverlay.tsx"),
      "utf8",
    );

    expect(planApi).toContain("Plan-Configured Orders & Products");
    expect(planApi).toContain("features: CANONICAL_PLANS.enterprise.features");
    expect(planApi).toContain("features: CANONICAL_PLANS[p.name]?.features ?? []");
    expect(planApi).not.toMatch(/deleteMany|subscriptionPlan\.(?:create|update|upsert)|syncPlansToLandingPage/);
    expect(overlay).toContain("Contact Us About Beta Plans");
    expect(overlay).toContain('window.location.assign("/contact")');
    expect(overlay).not.toContain("/api/subscriptions/current");
    expect(overlay).not.toContain("?plan=");
    expect(overlay).toContain("Setup terms:");
  });

  it("fails closed when a lead cannot be confirmed and tracks only newly stored leads", () => {
    const leadRoute = readFileSync(
      resolve(process.cwd(), "src/app/api/leads/route.ts"),
      "utf8",
    );
    const contactPage = readFileSync(
      resolve(landingDirectory, "ContactPage.tsx"),
      "utf8",
    );
    const contactSection = readFileSync(
      resolve(landingDirectory, "ContactSection.tsx"),
      "utf8",
    );

    expect((leadRoute.match(/success:\s*false/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(leadRoute).toContain("{ status: 503 }");
    expect(leadRoute).toContain("{ status: 500 }");
    expect(leadRoute).not.toMatch(/success despite error|fallback:\s*true|respond within 24 hours/i);
    for (const form of [contactPage, contactSection]) {
      expect(form).toContain("res.ok && data.success === true && data.confirmed === true");
      expect(form).not.toContain("Conversion tracking active");
    }
    expect(contactPage).toContain("setConversionEligible(data.stored === true)");
    expect(contactPage).toContain("if (!submitted || !conversionEligible) return");
    expect(contactPage).toContain("detail: { source: 'contact-page', timestamp: Date.now() }");
    expect(contactPage).not.toMatch(/detail:\s*\{[^}]*\b(?:email|name)\s*:/s);
  });

  it("keeps dynamic public identity claims behind reviewed copy and visibility flags", () => {
    const about = readFileSync(
      resolve(process.cwd(), "src/components/brandflow/landing/AboutPage.tsx"),
      "utf8",
    );
    const publicSocialSurfaces = ["Navbar.tsx", "Footer.tsx", "ContactPage.tsx"]
      .map((name) => readFileSync(resolve(landingDirectory, name), "utf8"))
      .join("\n");
    const guideRoute = readFileSync(
      resolve(process.cwd(), "src/app/api/lead-magnet/route.ts"),
      "utf8",
    );

    expect(about).not.toContain("identity.founderBio");
    expect(publicSocialSurfaces).toContain("identity.socialLinksVisible");
    expect(publicSocialSurfaces).toContain("identity.showInstagram");
    expect(guideRoute).toContain("showInstagram: Boolean(settings?.showInstagram)");
    expect(guideRoute).toContain("showWhatsApp: Boolean(settings?.showWhatsApp)");
  });

  it("publishes a byte-reproducible reviewed beta introduction guide", async () => {
    const generator = readFileSync(
      resolve(process.cwd(), "src/lib/lead-magnet-generator.ts"),
      "utf8",
    );
    const script = readFileSync(
      resolve(process.cwd(), "scripts/generate-public-lead-magnet.ts"),
      "utf8",
    );
    const staticPdf = readFileSync(
      resolve(process.cwd(), "public/downloads/valtriox-introduction.pdf"),
    );
    const { buildReviewedPublicLeadMagnet } = await import("../lib/public-lead-magnet");
    const reviewedPdf = await buildReviewedPublicLeadMagnet();

    expect(generator).toContain("INVITE-ONLY BETA");
    expect(generator).toContain("availability depends on plan, role, and configuration");
    expect(script).toContain('process.argv.includes("--check")');
    expect(script).toContain("checkedInPdf.equals(reviewedPdf)");
    expect(staticPdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(staticPdf.includes(Buffer.from("VALTRIOX_PUBLIC_GUIDE_INVITE_ONLY_BETA_V1"))).toBe(true);
    expect(staticPdf.equals(reviewedPdf)).toBe(true);
  });

  it("uses working feature anchors and non-link presentation for informational cards", () => {
    const about = readFileSync(resolve(landingDirectory, "AboutPage.tsx"), "utf8");
    const contact = readFileSync(resolve(landingDirectory, "ContactPage.tsx"), "utf8");
    const contactSection = readFileSync(resolve(landingDirectory, "ContactSection.tsx"), "utf8");
    const betaClaim = readFileSync(
      resolve(process.cwd(), "src/app/beta-claim/BetaClaimContent.tsx"),
      "utf8",
    );

    expect(about).toContain('href="/#features"');
    expect(contact).toContain('href="/#features"');
    expect(`${contact}\n${contactSection}`).not.toContain('href: "#"');
    expect(betaClaim).toContain("Informational next-step cards (not interactive controls)");
    expect(betaClaim).not.toContain("Set Up Dashboard");
  });

  it("discloses actual browser storage and current analytics consent behavior", () => {
    const cookies = readFileSync(
      resolve(process.cwd(), "src/components/brandflow/legal/CookiePolicyPage.tsx"),
      "utf8",
    );

    expect(cookies).toContain("vt-auth-sig");
    expect(cookies).toContain("valtriox-*");
    expect((cookies.match(/after the page becomes interactive/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(cookies).toMatch(/does not\s+provide a cookie-consent banner/);
    expect(cookies).toMatch(/loads without waiting/);
  });

  it("propagates configured support hours to public contact surfaces", () => {
    const identity = readFileSync(
      resolve(process.cwd(), "src/lib/platform-identity.tsx"),
      "utf8",
    );
    const contacts = ["ContactPage.tsx", "ContactSection.tsx"]
      .map((name) => readFileSync(resolve(landingDirectory, name), "utf8"))
      .join("\n");

    expect(identity).toContain("supportHours: string");
    expect(identity).toContain('supportHours: data.supportHours || "Mon-Fri: 9AM-6PM PKT"');
    expect(identity).toContain('supportHours: s.supportHours || "Mon-Fri: 9AM-6PM PKT"');
    expect(contacts).toContain("identity.supportHours");
  });
});
