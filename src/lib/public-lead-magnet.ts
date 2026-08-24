import { generateLeadMagnetPDF } from "./lead-magnet-generator";

export const PUBLIC_GUIDE_AUDIT_MARKER = Buffer.from(
  "\n% VALTRIOX_PUBLIC_GUIDE_INVITE_ONLY_BETA_V1\n",
  "utf8",
);

export const PUBLIC_GUIDE_DOCUMENT_DATE = new Date("2026-08-24T00:00:00.000Z");

export async function buildReviewedPublicLeadMagnet(): Promise<Buffer> {
  const pdf = await generateLeadMagnetPDF({
    companyName: "Valtriox",
    tagline: "Invite-only beta for selected brand-operation workflows",
    companyEmail: "ashir@valtriox.com",
    companyPhone: "+92-318 3916019",
    companyWebsite: "https://valtriox.com",
    companyAddress: null,
    whatsappNumber: null,
    socialLinksVisible: false,
    showInstagram: false,
    showFacebook: false,
    showTwitter: false,
    showLinkedin: false,
    showDiscord: false,
    showReddit: false,
    showYoutube: false,
    showTiktok: false,
    showWhatsApp: false,
    supportHours: "Monday–Friday, 9:00 AM–6:00 PM PKT",
    primaryBrandColor: "#D4A73A",
    documentDate: PUBLIC_GUIDE_DOCUMENT_DATE,
  });

  return Buffer.concat([pdf, PUBLIC_GUIDE_AUDIT_MARKER]);
}
