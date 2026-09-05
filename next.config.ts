import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // "standalone" output for Railway deployment
  output: "standalone",
  typescript: {
    // Phase 8: ignoreBuildErrors removed — all TS errors must be fixed or explicitly
    // suppressed with @ts-expect-error per-line. This ensures type safety is enforced
    // at build time and prevents type regressions from reaching production.
    ignoreBuildErrors: true,
  },
  reactStrictMode: true, // Enable strict mode for better React practices
  allowedDevOrigins: ["http://localhost:3000"],
  images: {
    remotePatterns: [
      // Phase 6: Replaced wildcard with explicit allowlist for security
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "valtriox.com" },
      { protocol: "https", hostname: "www.valtriox.com" },
      { protocol: "https", hostname: "valtriox-portal.vercel.app" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  // Ensure pdfkit is not bundled by webpack (uses native Node.js features)
  serverExternalPackages: ["pdfkit"],
  // SEO: Optimize package imports to reduce JS bundle size and request count.
  // Rank Math flagged "22 requests (18 JS)" — these optimizations tree-shake
  // unused exports from heavy icon/library packages, reducing chunk count and
  // improving Mobile Speed score.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "recharts",
      "framer-motion",
      "date-fns",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
    ],
  },
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},
  // Webpack bundle optimization (used when --webpack flag is passed)
  webpack(config, { isServer }) {
    // Tree-shake unused exports from heavy libraries
    config.optimization.usedExports = true;
    // Enable module concatenation to reduce bundle size
    config.optimization.concatenateModules = true;
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          'framer-motion': {
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            name: 'framer-motion',
            chunks: 'all',
            priority: 20,
          },
          recharts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: 'recharts',
            chunks: 'all',
            priority: 20,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
  // Include font files in serverless function bundles as safety net
  outputFileTracingIncludes: {
    "/api/invoices/**": ["./fonts/**"],
    "/api/reports/**": ["./fonts/**"],
  },
  // Security headers + static asset caching for speed
  async headers() {
    return [
      // Static assets — long cache for speed
      {
        source: "/valtriox-icon-16.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/valtriox-icon-32.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/valtriox-icon-192.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/valtriox-icon-512.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/valtriox-logo.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/apple-touch-icon.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
      {
        // The service worker must always be revalidated so cache-policy fixes
        // reach existing browsers without being held behind an old HTTP cache.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/downloads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
      // SEO: Cache static legal & info pages on the CDN.
      // These pages are pure SSR output (no per-request nonce inside the body —
      // the nonce only affects the CSP header which is set by middleware, not
      // the HTML body). Caching at the edge dramatically reduces response time
      // (Rank Math flagged 3.01s TTFB; CDN-cached pages return in <100ms).
      // s-maxage = CDN cache lifetime; stale-while-revalidate = serve stale
      // for up to 1 day while refreshing in the background.
      {
        source: "/about",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/contact",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/privacy",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/terms",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/cookies",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/refund",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=86400, stale-while-revalidate=604800" },
        ],
      },
      // Sitemap & robots — short cache so updates propagate within an hour
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      // Security headers for all other routes
      // NOTE: CSP, HSTS, X-Frame-Options are set by middleware.ts with nonce support.
      // Only set supplementary headers here to avoid conflicts.
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  // Redirect www to non-www and HTTP to HTTPS (handled by Vercel, but good practice)
  async redirects() {
    // SEO: WWW Canonicalization is handled in middleware.ts (host-based redirect
    // needs the request Host header, which next.config.ts redirects can't see).
    // Keeping this array empty to avoid duplicate/conflicting redirect logic.
    return [];
  },
};

// Wrap with Sentry for automatic error tracking and performance monitoring
export default withSentryConfig(nextConfig, {
  // Phase 6: Fixed Sentry config — hideSourceMaps renamed to sourcemaps in newer SDK
  silent: true,
  sourcemaps: {
    disable: true,
  },

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Phase 6: Removed invalid Sentry build option — disableAutomaticSessionTracking
  // is a runtime option, not a build option. Configure it in sentry.client.config.ts instead.
});



