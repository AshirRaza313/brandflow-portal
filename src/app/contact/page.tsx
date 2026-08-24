import type { Metadata } from "next";
import { ContactPage } from "@/components/brandflow/landing/ContactPage";
import { PlatformIdentityProvider } from "@/lib/platform-identity";

export const metadata: Metadata = {
  title: "Contact Valtriox | Beta Access, Email & Phone",
  description:
    "Contact the Valtriox beta team by email or phone during published business hours, or submit a request for invite-only beta access and an optional walkthrough.",
  keywords: [
    "contact Valtriox",
    "Valtriox email",
    "Valtriox phone",
    "ashir@valtriox.com",
    "+92-318 3916019",
    "Valtriox beta Pakistan",
    "beta walkthrough",
    "Muhammad Ashir Raza",
    "brand management consultation",
  ],
  alternates: {
    canonical: "https://valtriox.com/contact",
  },
  openGraph: {
    title: "Contact Valtriox | Invite-Only Beta",
    description:
      "Email or call the Valtriox team, or request invite-only beta access. Walkthrough scheduling is subject to availability.",
    url: "https://valtriox.com/contact",
    type: "website",
    images: [
      {
        url: "/valtriox-icon-512.png",
        width: 512,
        height: 512,
        alt: "Valtriox logo — contact us",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Valtriox | Invite-Only Beta",
    description:
      "Email or call the Valtriox beta team during published business hours.",
    images: ["/valtriox-icon-512.png"],
  },
  // Extra metadata Google reads for entity disambiguation
  other: {
    "contact:email": "ashir@valtriox.com",
    "contact:phone_number": "+92-318-3916019",
    "contact:country_name": "Pakistan",
    "business:contact_data:country_name": "Pakistan",
    "business:contact_data:email": "ashir@valtriox.com",
    "business:contact_data:phone_number": "+92-318-3916019",
  },
};

// Page-specific JSON-LD: ContactPage schema tells Google this page is
// about contacting the business. Combined with the global Organization
// schema in layout.tsx, this gives search engines an unambiguous signal
// that /contact is the canonical place to surface Valtriox's contact info.
const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  url: "https://valtriox.com/contact",
  name: "Contact Valtriox",
  description:
    "Get in touch with the Valtriox beta team by email or phone, or submit an invite-only beta request. Walkthroughs are arranged only when availability is confirmed.",
  mainEntity: {
    "@type": "Organization",
    name: "Valtriox",
    url: "https://valtriox.com",
    email: "ashir@valtriox.com",
    telephone: "+923183916019",
    founder: {
      "@type": "Person",
      name: "Muhammad Ashir Raza",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "ashir@valtriox.com",
      telephone: "+923183916019",
      areaServed: "PK",
      availableLanguage: ["English", "Urdu"],
      hoursAvailable: "Mon-Fri, 09:00-18:00 (PKT, UTC+5)",
    },
  },
};

export default function Contact() {
  return (
    <PlatformIdentityProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      {/*
        SSR-rendered contact details block — this is what Google's crawler
        sees on the FIRST HTML response (before any client-side JS runs).
        Wraps the verified contact facts in semantic organization markup so search
        engines and AI systems can extract them unambiguously.
        Visually hidden (sr-only) so it doesn't duplicate the cards below.
      */}
      <section
        className="sr-only"
        itemScope
        itemType="https://schema.org/Organization"
      >
        <h2>Contact Valtriox</h2>
        <p>
          Valtriox is an invite-only brand-operations beta founded by Muhammad
          Ashir Raza in Pakistan. You can reach the beta team using the contact
          details below.
        </p>
        <ul>
          <li>
            <strong>Email:</strong>{" "}
            <a href="mailto:ashir@valtriox.com" itemProp="email">
              ashir@valtriox.com
            </a>
          </li>
          <li>
            <strong>Phone:</strong>{" "}
            <a href="tel:+923183916019" itemProp="telephone">
              +92-318 3916019
            </a>
          </li>
          <li>
            <strong>Support Hours:</strong> Monday to Friday, 9:00 AM to 6:00 PM
            (PKT, UTC+5)
          </li>
          <li>
            <strong>Beta Walkthrough:</strong> You may request a walkthrough
            with the beta team. Timing and scope are confirmed separately and
            depend on availability.
          </li>
          <li>
            <strong>Founder:</strong>{" "}
            <span itemProp="founder" itemScope itemType="https://schema.org/Person">
              <span itemProp="name">Muhammad Ashir Raza</span>
            </span>
          </li>
          <li>
            <strong>Website:</strong>{" "}
            <a href="https://valtriox.com" itemProp="url">
              https://valtriox.com
            </a>
          </li>
        </ul>
      </section>
      <ContactPage />
    </PlatformIdentityProvider>
  );
}
