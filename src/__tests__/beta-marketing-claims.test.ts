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
const publicMarketingFiles = [
  ...collectSourceFiles(landingDirectory),
  resolve(process.cwd(), "src/app/about/page.tsx"),
  resolve(process.cwd(), "src/app/beta-claim/layout.tsx"),
  resolve(process.cwd(), "src/app/layout.tsx"),
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
});
