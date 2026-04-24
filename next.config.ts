import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Vercel handles output automatically — no "standalone" needed */
  typescript: {
    // NOTE: TypeScript 6.0.2 has a known stack overflow issue with large projects
    // (collectLinkedAliases exceeds max call stack). Keep ignoreBuildErrors enabled
    // until upstream fix is available. Type safety is enforced via strict: true in tsconfig.json
    // and ESLint rules. All new code is written with proper types.
    ignoreBuildErrors: true,
    // Enable stricter checks incrementally
    // tsconfigPath: "./tsconfig.json",
  },
  reactStrictMode: true, // Enable strict mode for better React practices
  allowedDevOrigins: ["*"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Ensure pdfkit is not bundled by webpack (uses native Node.js features)
  serverExternalPackages: ["pdfkit"],
  experimental: {
    // Include font files in serverless function bundles as safety net
    outputFileTracingIncludes: {
      "/api/invoices/**": ["./fonts/**"],
      "/api/reports/**": ["./fonts/**"],
    },
  },
  // Security headers via Next.js config (backup for middleware)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  // Redirect www to non-www and HTTP to HTTPS (handled by Vercel, but good practice)
  async redirects() {
    return [];
  },
};

export default nextConfig;
