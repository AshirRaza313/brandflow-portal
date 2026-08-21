import type { Metadata } from "next";
import { AboutPage } from "@/components/brandflow/landing/AboutPage";
import { PlatformIdentityProvider } from "@/lib/platform-identity";

const SITE_URL = "https://valtriox.com";
const PAGE_URL = `${SITE_URL}/about`;

const TITLE = "About Valtriox | Founded by Muhammad Ashir Raza";
const DESCRIPTION =
  "Valtriox is the universal brand operating system founded by Muhammad Ashir Raza. Idea born in 2024, planned through 2025, built daily for months in 2026, and now welcoming early adopters through an invite-only beta in Pakistan.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "Valtriox",
    "Muhammad Ashir Raza",
    "Valtriox founder",
    "Valtriox creator",
    "brand management platform",
    "SaaS Pakistan",
    "universal brand operating system",
    "order management",
    "inventory management",
    "multi-tenant SaaS",
  ],
  authors: [{ name: "Muhammad Ashir Raza", url: "https://www.linkedin.com/in/muhammad-ashir-raza" }],
  creator: "Muhammad Ashir Raza",
  publisher: "Valtriox",
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: PAGE_URL,
    siteName: "Valtriox",
    locale: "en_US",
    images: [
      {
        url: "/valtriox-icon-512.png",
        width: 512,
        height: 512,
        alt: "Valtriox logo, founded by Muhammad Ashir Raza",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/valtriox-icon-512.png"],
    creator: "@valtriox",
    site: "@valtriox",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

// ── JSON-LD structured data for the About page ──
// Helps Google and AI search engines clearly identify the founder.
const jsonLdAboutPage = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Valtriox",
  url: PAGE_URL,
  description: DESCRIPTION,
  mainEntity: {
    "@type": "Organization",
    name: "Valtriox",
    url: SITE_URL,
    foundingDate: "2024",
    founder: {
      "@type": "Person",
      name: "Muhammad Ashir Raza",
      url: "https://www.linkedin.com/in/muhammad-ashir-raza",
      jobTitle: "Founder & Lead Developer",
      email: "ashir@valtriox.com",
      nationality: "Pakistani",
      knowsAbout: [
        "Full-Stack Development",
        "SaaS Architecture",
        "Brand Management Software",
        "Next.js",
        "TypeScript",
        "PostgreSQL",
        "Multi-tenant Systems",
      ],
    },
  },
};

const jsonLdPerson = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Muhammad Ashir Raza",
  url: "https://www.linkedin.com/in/muhammad-ashir-raza",
  jobTitle: "Founder & Lead Developer at Valtriox",
  worksFor: {
    "@type": "Organization",
    name: "Valtriox",
    url: SITE_URL,
  },
  email: "ashir@valtriox.com",
  nationality: "Pakistani",
  sameAs: ["https://www.linkedin.com/in/muhammad-ashir-raza"],
};

export default function About() {
  return (
    <PlatformIdentityProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdAboutPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdPerson) }}
      />
      <AboutPage />
    </PlatformIdentityProvider>
  );
}
