/**
 * Ultra Premium Invitation Document Generator for Valtriox Beta Invites.
 *
 * Produces:
 *  1. HTML email template (ultra premium, sendable via Resend/SMTP)
 *  2. WhatsApp formatted message (rich Unicode formatting)
 *  3. WhatsApp deep link (wa.me with pre-filled message)
 *  4. Printable HTML document (for download as PDF or print)
 */

import { BRAND_LOGO_DATA_URI } from "./brand-logo";

// ═══════════════════════════════════════════════════════════════
//  ULTRA PREMIUM HTML EMAIL TEMPLATE
// ═══════════════════════════════════════════════════════════════

export interface UltraPremiumInviteData {
  email: string;
  token: string;
  plan: string;
  trialDays: number;
  claimUrl: string;
  platformName: string;
  platformWebsite: string;
  companyEmail: string;
  companyPhone: string | null;
  companyAddress: string | null;
  invitedByName?: string;
}

const planFeatureMap: Record<string, string[]> = {
  enterprise: [
    'Unlimited Orders & Products',
    'AI-Powered Analytics Dashboard',
    'Priority Support 24/7',
    'Custom White-Label Branding',
    'Unlimited Team Members',
    'WhatsApp Business Integration',
    'Advanced SEO & Marketing Tools',
    'Full API Access',
  ],
  professional: [
    'Up to 1,000 Orders/Month',
    'Advanced Analytics Dashboard',
    'Priority Email Support',
    'Custom Branding Suite',
    'Up to 15 Team Members',
    'WhatsApp Integration',
    'SEO Tools',
    'Email Marketing Automation',
  ],
  growth: [
    'Up to 500 Orders/Month',
    'Standard Analytics',
    'Email Support',
    'Basic Branding',
    'Up to 5 Team Members',
    'Social Media Management',
    'Loyalty Program Tools',
  ],
  starter: [
    'Up to 100 Orders/Month',
    'Basic Dashboard',
    'Community Support',
    'Standard Branding',
    'Up to 3 Team Members',
    'Product Catalog',
  ],
};

function getPlanFeatures(plan: string): string[] {
  return planFeatureMap[plan] || planFeatureMap.enterprise;
}

export function getUltraPremiumInviteHtml(data: UltraPremiumInviteData): string {
  const planLabel = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);
  const features = getPlanFeatures(data.plan);
  const currentYear = new Date().getFullYear();
  const expiryDate = data.trialDays
    ? new Date(Date.now() + data.trialDays * 86400000).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "TBD";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exclusive Beta Invitation - ${data.platformName}</title>
</head>
<body style="margin:0;padding:0;background:#06060a;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#06060a;min-height:100vh;padding:40px 16px;">
    <tr><td align="center">

      <!-- Outer glow frame -->
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td style="padding:2px;background:linear-gradient(135deg,rgba(211,166,56,0.4) 0%,rgba(211,166,56,0.05) 50%,rgba(211,166,56,0.3) 100%);border-radius:22px;">

          <!-- Inner card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c14;border-radius:20px;overflow:hidden;">

            <!-- ═══ HEADER ═══ -->
            <tr>
              <td style="background:linear-gradient(135deg,rgba(211,166,56,0.12) 0%,#0c0c14 50%,rgba(139,92,246,0.06) 100%);padding:48px 40px 32px;border-bottom:1px solid rgba(211,166,56,0.15);position:relative;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <!-- Exclusive badge -->
                      <div style="display:inline-block;padding:4px 14px;background:rgba(211,166,56,0.12);border:1px solid rgba(211,166,56,0.25);border-radius:20px;margin-bottom:16px;">
                        <span style="font-size:10px;color:#D4A73A;text-transform:uppercase;letter-spacing:3px;font-weight:700;">Exclusive Beta Invitation</span>
                      </div>
                      <!-- Brand name -->
                      <div style="font-size:32px;font-weight:900;color:#D4A73A;letter-spacing:-1px;margin-bottom:6px;line-height:1;">
                        ${data.platformName}
                      </div>
                      <div style="font-size:12px;color:#6b6b7b;text-transform:uppercase;letter-spacing:2.5px;font-weight:500;">
                        COMMAND YOUR BRAND UNIVERSE
                      </div>
                    </td>
                    <td align="right" valign="top">
                      <div style="display:inline-block;width:86px;height:71px;text-align:center;overflow:hidden;border-radius:10px;">
                        <img src="${BRAND_LOGO_DATA_URI}" alt="Valtriox" width="86" height="71" style="display:block;width:86px;height:71px;object-fit:contain;border:0;">
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ═══ VIP SECTION ═══ -->
            <tr>
              <td style="padding:28px 40px 0;" align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(211,166,56,0.08) 0%,rgba(211,166,56,0.02) 100%);border:1px solid rgba(211,166,56,0.12);border-radius:14px;">
                  <tr>
                    <td style="padding:20px 24px;text-align:center;">
                      <div style="font-size:18px;color:#D4A73A;font-weight:800;margin-bottom:6px;letter-spacing:0.5px;">&#9733; VIP Beta Access &#9733;</div>
                      <div style="font-size:13px;color:#8b8b9b;line-height:1.5;">You&apos;ve been exclusively selected for early access to Pakistan&apos;s premier brand management platform</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ═══ GREETING ═══ -->
            <tr>
              <td style="padding:28px 40px 0;">
                <p style="margin:0;font-size:18px;color:#ffffff;font-weight:700;margin-bottom:16px;">
                  Dear Brand Owner,
                </p>
                <p style="margin:0;font-size:15px;color:#9ca3af;line-height:1.7;">
                  Congratulations! You have been <strong style="color:#D4A73A;">exclusively selected</strong> for beta access to <strong style="color:#ffffff;">${data.platformName}</strong> - Pakistan&apos;s most advanced brand management portal. This is a limited-time opportunity to experience our full-featured platform <strong style="color:#ffffff;">completely free</strong> before public launch.
                </p>
              </td>
            </tr>

            <!-- ═══ INVITATION DETAILS CARD ═══ -->
            <tr>
              <td style="padding:28px 40px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#08080e;border:1px solid rgba(211,166,56,0.1);border-radius:16px;overflow:hidden;">
                  <!-- Plan + Trial -->
                  <tr>
                    <td style="padding:24px 28px;border-bottom:1px solid rgba(211,166,56,0.08);">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width:50%;">
                            <div style="font-size:10px;color:#6b6b7b;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-bottom:8px;">Your Plan</div>
                            <div style="font-size:26px;color:#D4A73A;font-weight:900;letter-spacing:-0.5px;">${planLabel}</div>
                          </td>
                          <td align="right" style="width:50%;">
                            <div style="font-size:10px;color:#6b6b7b;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-bottom:8px;">Free Trial</div>
                            <div style="font-size:26px;color:#ffffff;font-weight:900;letter-spacing:-0.5px;">${data.trialDays} Days</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Invitation Code -->
                  <tr>
                    <td style="padding:20px 28px;border-bottom:1px solid rgba(211,166,56,0.08);background:rgba(211,166,56,0.03);">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <div style="font-size:10px;color:#6b6b7b;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-bottom:8px;">Invitation Code</div>
                            <div style="font-size:28px;color:#D4A73A;font-weight:900;letter-spacing:6px;font-family:'Courier New',monospace;background:rgba(211,166,56,0.06);display:inline-block;padding:8px 20px;border:1px solid rgba(211,166,56,0.15);border-radius:10px;">${data.token}</div>
                          </td>
                          <td align="right" valign="bottom">
                            <div style="font-size:11px;color:#6b6b7b;">Valid until: ${expiryDate}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Features -->
                  <tr>
                    <td style="padding:20px 28px;">
                      <div style="font-size:10px;color:#D4A73A;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:16px;">What You Get</div>
                      ${features.map(f => `
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                        <tr>
                          <td style="width:22px;vertical-align:top;">
                            <div style="width:18px;height:18px;border-radius:50%;background:rgba(211,166,56,0.12);border:1px solid rgba(211,166,56,0.25);text-align:center;line-height:18px;font-size:10px;color:#D4A73A;">&#10003;</div>
                          </td>
                          <td style="padding-left:12px;font-size:14px;color:#d1d5db;line-height:1.4;">${f}</td>
                        </tr>
                      </table>`).join("")}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ═══ CTA BUTTON ═══ -->
            <tr>
              <td style="padding:36px 40px 0;" align="center">
                <a href="${data.claimUrl}" target="_blank" style="
                  display:inline-block;
                  background:linear-gradient(135deg,#D4A73A 0%,#d4a82a 40%,#a88620 100%);
                  color:#161B26;
                  text-decoration:none;
                  font-size:16px;
                  font-weight:900;
                  padding:18px 56px;
                  border-radius:14px;
                  letter-spacing:0.5px;
                  text-transform:uppercase;
                  box-shadow:0 4px 30px rgba(211,166,56,0.3);
                ">
                  Claim Your Beta Access Now
                </a>
              </td>
            </tr>

            <!-- ═══ FALLBACK URL ═══ -->
            <tr>
              <td style="padding:14px 40px 0;text-align:center;">
                <p style="margin:0;font-size:11px;color:#4b4b5b;line-height:1.6;">
                  If the button doesn&apos;t work, copy this link into your browser:<br>
                  <a href="${data.claimUrl}" style="color:#D4A73A;word-break:break-all;font-size:11px;">${data.claimUrl}</a>
                </p>
              </td>
            </tr>

            <!-- ═══ WHY BETA ═══ -->
            <tr>
              <td style="padding:28px 40px 0;">
                <p style="margin:0;font-size:13px;color:#8b8b9b;font-weight:700;margin-bottom:14px;text-transform:uppercase;letter-spacing:1px;">Why Join Our Beta?</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#08080e;border:1px solid rgba(255,255,255,0.04);border-radius:14px;overflow:hidden;">
                  ${[
                    { icon: "&#9733;", t: "Free premium access during the entire beta period" },
                    { icon: "&#9889;", t: "Shape the product with your feedback" },
                    { icon: "&#9829;", t: "Lock in exclusive early-adopter pricing for life" },
                    { icon: "&#9742;", t: "Direct access to our founding team" },
                  ].map(item => `
                  <tr>
                    <td style="padding:16px 22px;border-bottom:1px solid rgba(255,255,255,0.03);">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="vertical-align:top;width:28px;">
                            <div style="font-size:18px;color:#D4A73A;text-align:center;line-height:1.3;">${item.icon}</div>
                          </td>
                          <td style="padding-left:14px;font-size:14px;color:#d1d5db;line-height:1.5;">${item.t}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>`).join("")}
                </table>
              </td>
            </tr>

            <!-- ═══ LIMITED SPOTS NOTE ═══ -->
            <tr>
              <td style="padding:20px 40px 0;">
                <div style="background:rgba(211,166,56,0.05);border:1px solid rgba(211,166,56,0.1);border-radius:12px;padding:16px 20px;">
                  <p style="margin:0;font-size:12px;color:#8b8b9b;line-height:1.6;">
                    <strong style="color:#D4A73A;">Limited spots available.</strong> Beta access is by invitation only and may close without notice. Your ${data.trialDays}-day free trial begins when you activate your account.
                  </p>
                </div>
              </td>
            </tr>

            <!-- ═══ SIGN-OFF ═══ -->
            <tr>
              <td style="padding:28px 40px 12px;">
                <p style="margin:0;font-size:15px;color:#ffffff;line-height:1.6;">
                  We look forward to partnering with you,<br>
                  <strong style="color:#D4A73A;font-size:16px;">${data.platformName} Team</strong><br>
                  <span style="font-size:12px;color:#6b6b7b;">${data.companyEmail}${data.companyPhone ? " | " + data.companyPhone : ""}</span>
                </p>
              </td>
            </tr>

            <!-- ═══ FOOTER ═══ -->
            <tr>
              <td style="padding:24px 40px 28px;border-top:1px solid rgba(255,255,255,0.04);">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:11px;color:#3b3b4b;line-height:1.5;">
                      &copy; ${currentYear} ${data.platformName}. All rights reserved.${data.companyAddress ? "<br>" + data.companyAddress : ""}<br>
                      <a href="${data.platformWebsite}" style="color:#D4A73A;text-decoration:none;">${data.platformWebsite}</a>
                    </td>
                    <td align="right" style="font-size:10px;color:#3b3b4b;text-transform:uppercase;letter-spacing:1px;">
                      Confidential
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
          <!-- /Inner card -->

        </td></tr>
      </table>
      <!-- /Outer glow frame -->

    </td></tr>
  </table>

</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
//  ULTRA PREMIUM WHATSAPP MESSAGE
// ═══════════════════════════════════════════════════════════════

export function getUltraPremiumWhatsAppMessage(data: UltraPremiumInviteData): string {
  const planLabel = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);
  const features = getPlanFeatures(data.plan);
  const expiryDate = data.trialDays
    ? new Date(Date.now() + data.trialDays * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "TBD";

  const message = [
    `\u{1F3AF} *V A L T R I O X*`,
    `COMMAND YOUR BRAND UNIVERSE`,
    ``,
    `\u{1F48E} *EXCLUSIVE BETA INVITATION* \u{1F48E}`,
    ``,
    `Dear Brand Owner,`,
    ``,
    `Congratulations! You have been *exclusively selected* for beta access to *Valtriox* - COMMAND YOUR BRAND UNIVERSE. This is a *limited-time opportunity* to experience our platform *completely free* before public launch.`,
    ``,
    `\u{1F4CB} *YOUR INVITATION DETAILS*`,
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
    `\u{1F3C6} Plan: *${planLabel}*`,
    `\u{23F1} Free Trial: *${data.trialDays} Days*`,
    `\u{1F511} Invitation Code: *${data.token}*`,
    `\u{1F4C5} Valid Until: *${expiryDate}*`,
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
    ``,
    `\u{2728} *WHAT YOU GET:*`,
    features.map(f => `\u2705 ${f}`).join("\n"),
    ``,
    `\u{1F517} *CLAIM YOUR ACCESS NOW:*`,
    `${data.claimUrl}`,
    ``,
    `\u{1F31F} *WHY JOIN OUR BETA?*`,
    `\u{2B50} Free premium access during the entire beta period`,
    `\u{1F4A1} Shape the product with your feedback`,
    `\u{1F496} Lock in exclusive early-adopter pricing for life`,
    `\u{1F4DE} Direct access to our founding team`,
    ``,
    `\u{26A0}\uFE0F *Limited spots available.* Beta access is by invitation only.`,
    ``,
    `\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014`,
    `*${data.platformName} Team*`,
    `${data.companyEmail}${data.companyPhone ? " | " + data.companyPhone : ""}`,
    `${data.platformWebsite}`,
  ].join("\n");

  return message;
}

// ═══════════════════════════════════════════════════════════════
//  WHATSAPP DEEP LINK
// ═══════════════════════════════════════════════════════════════

export function generateUltraPremiumWhatsAppLink(phone: string, data: UltraPremiumInviteData): string {
  const message = getUltraPremiumWhatsAppMessage(data);
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

// ═══════════════════════════════════════════════════════════════
//  PRINTABLE DOCUMENT (full-page HTML for PDF / Print)
// ═══════════════════════════════════════════════════════════════

export function getPrintableInvitationHtml(data: UltraPremiumInviteData): string {
  const planLabel = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);
  const features = getPlanFeatures(data.plan);
  const currentYear = new Date().getFullYear();
  const expiryDate = data.trialDays
    ? new Date(Date.now() + data.trialDays * 86400000).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "TBD";
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Beta Invitation - ${data.platformName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: #06060a;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .doc {
      width: 100%;
      max-width: 700px;
      background: #0c0c14;
      border-radius: 24px;
      overflow: hidden;
      border: 2px solid rgba(211,166,56,0.25);
      box-shadow: 0 0 80px rgba(211,166,56,0.08);
    }
    .header {
      background: linear-gradient(135deg, rgba(211,166,56,0.15) 0%, #0c0c14 50%, rgba(139,92,246,0.06) 100%);
      padding: 48px 44px 32px;
      border-bottom: 1px solid rgba(211,166,56,0.15);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }
    .badge {
      display: inline-block;
      padding: 5px 16px;
      background: rgba(211,166,56,0.12);
      border: 1px solid rgba(211,166,56,0.25);
      border-radius: 20px;
      font-size: 10px;
      color: #D4A73A;
      text-transform: uppercase;
      letter-spacing: 3px;
      font-weight: 700;
      margin-bottom: 18px;
    }
    .brand-name {
      font-size: 36px;
      font-weight: 900;
      color: #D4A73A;
      letter-spacing: -1px;
      line-height: 1;
    }
    .brand-sub {
      font-size: 12px;
      color: #6b6b7b;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      margin-top: 8px;
    }
    .logo-box {
      width: 104px;
      height: 86px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
      border-radius: 10px;
    }
    .vip-section {
      padding: 28px 44px 0;
      text-align: center;
    }
    .vip-box {
      background: linear-gradient(135deg, rgba(211,166,56,0.08) 0%, rgba(211,166,56,0.02) 100%);
      border: 1px solid rgba(211,166,56,0.12);
      border-radius: 14px;
      padding: 22px 24px;
    }
    .vip-title {
      font-size: 18px;
      color: #D4A73A;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .vip-sub {
      font-size: 13px;
      color: #8b8b9b;
      line-height: 1.5;
    }
    .content { padding: 28px 44px 0; }
    .greeting { font-size: 18px; font-weight: 700; margin-bottom: 16px; }
    .body-text { font-size: 15px; color: #9ca3af; line-height: 1.7; }
    .details-card {
      margin-top: 28px;
      background: #08080e;
      border: 1px solid rgba(211,166,56,0.1);
      border-radius: 16px;
      overflow: hidden;
    }
    .plan-row {
      padding: 24px 28px;
      border-bottom: 1px solid rgba(211,166,56,0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .plan-label {
      font-size: 10px;
      color: #6b6b7b;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .plan-value-lg { font-size: 28px; font-weight: 900; color: #D4A73A; }
    .plan-value-white { font-size: 28px; font-weight: 900; color: #ffffff; }
    .code-row {
      padding: 20px 28px;
      border-bottom: 1px solid rgba(211,166,56,0.08);
      background: rgba(211,166,56,0.03);
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .code {
      font-size: 32px;
      color: #D4A73A;
      font-weight: 900;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
      background: rgba(211,166,56,0.06);
      padding: 10px 24px;
      border: 1px solid rgba(211,166,56,0.15);
      border-radius: 12px;
    }
    .features-section { padding: 20px 28px; }
    .features-title {
      font-size: 10px;
      color: #D4A73A;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .feature-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
      font-size: 14px;
      color: #d1d5db;
    }
    .feature-check {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgba(211,166,56,0.12);
      border: 1px solid rgba(211,166,56,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #D4A73A;
      flex-shrink: 0;
    }
    .cta-section {
      padding: 36px 44px 0;
      text-align: center;
    }
    .cta-link {
      display: inline-block;
      background: linear-gradient(135deg, #D4A73A 0%, #d4a82a 40%, #a88620 100%);
      color: #161B26;
      text-decoration: none;
      font-size: 16px;
      font-weight: 900;
      padding: 18px 56px;
      border-radius: 14px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .fallback-url {
      padding: 14px 44px 0;
      text-align: center;
      font-size: 11px;
      color: #4b4b5b;
      word-break: break-all;
    }
    .fallback-url a { color: #D4A73A; }
    .why-section { padding: 28px 44px 0; }
    .why-title {
      font-size: 13px;
      color: #8b8b9b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 14px;
    }
    .why-card {
      background: #08080e;
      border: 1px solid rgba(255,255,255,0.04);
      border-radius: 14px;
      overflow: hidden;
    }
    .why-item {
      padding: 16px 22px;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 14px;
      color: #d1d5db;
    }
    .why-icon { font-size: 18px; color: #D4A73A; width: 28px; text-align: center; }
    .note {
      margin: 20px 44px 0;
      background: rgba(211,166,56,0.05);
      border: 1px solid rgba(211,166,56,0.1);
      border-radius: 12px;
      padding: 16px 20px;
      font-size: 12px;
      color: #8b8b9b;
      line-height: 1.6;
    }
    .note strong { color: #D4A73A; }
    .sign-off { padding: 28px 44px 12px; }
    .sign-off-name { font-size: 16px; color: #D4A73A; font-weight: 700; }
    .sign-off-sub { font-size: 12px; color: #6b6b7b; margin-top: 4px; }
    .footer {
      padding: 24px 44px 28px;
      border-top: 1px solid rgba(255,255,255,0.04);
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer-left { font-size: 11px; color: #3b3b4b; line-height: 1.5; }
    .footer-left a { color: #D4A73A; text-decoration: none; }
    .footer-right { font-size: 10px; color: #3b3b4b; text-transform: uppercase; letter-spacing: 1px; }
    .date-issued {
      margin-top: 4px;
      font-size: 10px;
      color: #3b3b4b;
    }
    @media print {
      body { background: #0c0c14; padding: 0; }
      .doc { max-width: 100%; border-radius: 0; box-shadow: none; border: none; }
    }
  </style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div>
        <div class="badge">Exclusive Beta Invitation</div>
        <div class="brand-name">${data.platformName}</div>
        <div class="brand-sub">COMMAND YOUR BRAND UNIVERSE</div>
      </div>
      <div class="logo-box"><img src="${BRAND_LOGO_DATA_URI}" alt="Valtriox" width="104" height="86" style="display:block;width:104px;height:86px;object-fit:contain;border:0;"></div>
    </div>

    <div class="vip-section">
      <div class="vip-box">
        <div class="vip-title">&#9733; VIP Beta Access &#9733;</div>
        <div class="vip-sub">You've been exclusively selected for early access to Pakistan's premier brand management platform</div>
      </div>
    </div>

    <div class="content">
      <p class="greeting">Dear Brand Owner,</p>
      <p class="body-text">
        Congratulations! You have been <strong style="color:#D4A73A">exclusively selected</strong> for beta access to <strong style="color:#ffffff">${data.platformName}</strong> - COMMAND YOUR BRAND UNIVERSE. This is a <strong style="color:#ffffff">limited-time opportunity</strong> to experience our full-featured platform <strong style="color:#ffffff">completely free</strong> before public launch.
      </p>

      <div class="details-card">
        <div class="plan-row">
          <div><div class="plan-label">Your Plan</div><div class="plan-value-lg">${planLabel}</div></div>
          <div style="text-align:right"><div class="plan-label">Free Trial</div><div class="plan-value-white">${data.trialDays} Days</div></div>
        </div>
        <div class="code-row">
          <div>
            <div class="plan-label">Invitation Code</div>
            <div class="code">${data.token}</div>
          </div>
          <div style="font-size:11px;color:#6b6b7b;padding-bottom:12px;">Valid until:<br><strong style="color:#9ca3af">${expiryDate}</strong></div>
        </div>
        <div class="features-section">
          <div class="features-title">What You Get</div>
          ${features.map(f => `<div class="feature-item"><div class="feature-check">&#10003;</div>${f}</div>`).join("")}
        </div>
      </div>
    </div>

    <div class="cta-section">
      <a class="cta-link" href="${data.claimUrl}">Claim Your Beta Access Now</a>
    </div>
    <div class="fallback-url">
      Link: <a href="${data.claimUrl}">${data.claimUrl}</a>
    </div>

    <div class="why-section">
      <div class="why-title">Why Join Our Beta?</div>
      <div class="why-card">
        <div class="why-item"><div class="why-icon">&#9733;</div> Free premium access during the entire beta period</div>
        <div class="why-item"><div class="why-icon">&#9889;</div> Shape the product with your feedback</div>
        <div class="why-item"><div class="why-icon">&#9829;</div> Lock in exclusive early-adopter pricing for life</div>
        <div class="why-item"><div class="why-icon">&#9742;</div> Direct access to our founding team</div>
      </div>
    </div>

    <div class="note">
      <strong>Limited spots available.</strong> Beta access is by invitation only and may close without notice. Your ${data.trialDays}-day free trial begins when you activate your account.
    </div>

    <div class="sign-off">
      <p style="font-size:15px;color:#ffffff;line-height:1.6;">
        We look forward to partnering with you,<br>
        <span class="sign-off-name">${data.platformName} Team</span><br>
        <span class="sign-off-sub">${data.companyEmail}${data.companyPhone ? " | " + data.companyPhone : ""}</span>
      </p>
      <div class="date-issued">Invitation issued: ${today}</div>
    </div>

    <div class="footer">
      <div class="footer-left">
        &copy; ${currentYear} ${data.platformName}. All rights reserved.${data.companyAddress ? "<br>" + data.companyAddress : ""}<br>
        <a href="${data.platformWebsite}">${data.platformWebsite}</a>
      </div>
      <div class="footer-right">Confidential</div>
    </div>
  </div>
</body>
</html>`;
}
