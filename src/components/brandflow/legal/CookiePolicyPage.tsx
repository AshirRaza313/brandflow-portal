// @ts-nocheck - Phase 8: pre-existing TS errors pending migration
"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { ArrowLeft, BarChart3, Database, Settings, Shield } from "lucide-react";
import { usePlatformIdentity } from "@/lib/platform-identity";
import { cn } from "@/lib/utils";

interface LegalPageProps {
  onBack?: () => void;
}

export function CookiePolicyPage({ onBack }: LegalPageProps) {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme === "dark" || appTheme === "premium-dark";
  const { identity } = usePlatformIdentity();

  const headingClass = isDark
    ? "text-xl font-semibold text-white mb-3 pb-2 border-b border-white/10"
    : "text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200";
  const cellNameClass = isDark
    ? "p-3 text-slate-300 border border-slate-200 font-mono text-xs"
    : "p-3 text-slate-700 border border-slate-200 font-mono text-xs";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-amber-600 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to {identity.companyName}
        </button>

        <div className="mb-10">
          <h1 className={isDark ? "text-3xl sm:text-4xl font-bold text-white mb-3" : "text-3xl sm:text-4xl font-bold text-slate-900 mb-3"}>
            Cookie Policy
          </h1>
          <p className="text-slate-500 text-sm">Last Updated: August 24, 2026</p>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              This Cookie Policy describes the cookies and browser-storage technologies currently
              used by {identity.companyName} on its website and Portal. Read it with our{" "}
              <a href="/privacy" className="text-amber-700 font-medium hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className={headingClass}>1. Technologies Covered by This Policy</h2>
            <p className="text-slate-600 leading-relaxed">
              A cookie is a small value a website asks a browser to store and return with later
              requests. Browser local storage and cache storage remain on the device but are not
              cookies and are not automatically attached to requests. This policy identifies each
              type separately because the Portal currently uses all three for different purposes.
            </p>
          </section>

          <section>
            <h2 className={headingClass}>2. First-Party Authentication Cookies</h2>
            <div className={cn("flex items-start gap-4 p-4 rounded-lg border", isDark ? "bg-white/[0.03] border-white/10" : "bg-slate-50 border-slate-200")}>
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm text-slate-600">
                Successful Portal login sets the following first-party <code>vt-*</code> cookies.
                The server uses them to identify the signed-in account, apply role and organization
                scope, and verify the authentication values.
              </p>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Cookie</th>
                    <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Current purpose</th>
                    <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Current lifetime</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={cellNameClass}>vt-user-id</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Signed-in user identifier</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Up to 7 days</td>
                  </tr>
                  <tr>
                    <td className={cellNameClass}>vt-user-email</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Signed-in account email</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Up to 7 days</td>
                  </tr>
                  <tr>
                    <td className={cellNameClass}>vt-user-role</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Role used for authorization checks</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Up to 7 days</td>
                  </tr>
                  <tr>
                    <td className={cellNameClass}>vt-org-id</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Organization scope, when an organization is assigned</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Up to 7 days</td>
                  </tr>
                  <tr>
                    <td className={cellNameClass}>vt-auth-sig</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Integrity signature for the authentication values</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Up to 7 days</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-slate-600 leading-relaxed mt-3">
              These cookies currently use <code>HttpOnly</code>, <code>SameSite=Lax</code>, and
              path <code>/</code>; production cookies also use <code>Secure</code>. Logging out asks
              the server to expire them immediately. Blocking or deleting them can prevent signed-in
              Portal use. There is no separate in-product switch for authentication cookies.
            </p>
          </section>

          <section>
            <h2 className={headingClass}>3. Local Storage Used by the Portal</h2>
            <div className={cn("flex items-start gap-4 p-4 rounded-lg border", isDark ? "bg-white/[0.03] border-white/10" : "bg-slate-50 border-slate-200")}>
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm text-slate-600">
                The Portal uses browser local storage under <code>valtriox-*</code> keys. Unlike the
                authentication cookies above, these values can be read by application scripts on
                the same origin and have no server-set expiry date.
              </p>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Keys</th>
                    <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Current purpose</th>
                    <th className="text-left p-3 font-semibold text-slate-900 border border-slate-200">Retention on device</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={cellNameClass}>valtriox-theme, valtriox-language, valtriox-appTheme</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Display theme and language preferences</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Until the app replaces/removes it or browser site data is cleared</td>
                  </tr>
                  <tr>
                    <td className={cellNameClass}>valtriox-session-active</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Boolean UI hint that a session was active; it is not an authentication credential</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Removed on logout or error recovery</td>
                  </tr>
                  <tr>
                    <td className={cellNameClass}>valtriox-brandname, valtriox-logo, valtriox-tagline, valtriox-configured</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Locally displayed brand setup values</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Removed on logout/error recovery or when browser site data is cleared</td>
                  </tr>
                  <tr>
                    <td className={cellNameClass}>valtriox-timezone-detected, valtriox-timezone-value</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Timezone setup state and selected/detected timezone</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Until replaced or browser site data is cleared</td>
                  </tr>
                  <tr>
                    <td className={cellNameClass}>valtriox-social-posts, valtriox-chat-&#123;organization&#125;-&#123;channel&#125;</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Browser-local social-post state and up to the latest 200 chat messages per organization/channel</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Until the feature replaces/removes it or browser site data is cleared</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-slate-600 leading-relaxed mt-3">
              The exact set of keys can change as beta features change. Clearing browser site data
              removes these local values and may reset preferences or locally stored feature content.
            </p>
          </section>

          <section>
            <h2 className={headingClass}>4. Analytics and Advertising Scripts</h2>
            <div className={cn("flex items-start gap-4 p-4 rounded-lg border", isDark ? "bg-white/[0.03] border-white/10" : "bg-slate-50 border-slate-200")}>
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-sm text-slate-600 space-y-2">
                <p>
                  If a Google Analytics measurement ID is configured for a deployment, the site loads
                  Google&apos;s analytics script after the page becomes interactive and configures it for
                  that ID. Google may then receive usage/device information and use its own
                  identifiers or cookies under Google&apos;s terms.
                </p>
                <p>
                  If a Meta Pixel ID is configured, the site loads the Meta Pixel after the page becomes interactive,
                  records a page-view event, and may record lead events. A page-view request can also
                  occur through the pixel&apos;s non-JavaScript image fallback.
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Current consent behavior:</strong> As of the date above, the site does not
                provide a cookie-consent banner or category-preference control. When the relevant
                deployment ID is configured, Google Analytics or Meta Pixel loads without waiting
                for a prior in-product consent choice. You can use browser controls, content blockers,
                or the provider controls below.
              </p>
            </div>

            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-4">
              <li>
                Google: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">Privacy Policy</a>
                {" and "}
                <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">Analytics Opt-out Add-on</a>
              </li>
              <li>
                Meta: <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">Privacy Policy</a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className={headingClass}>5. Managing Cookies and Browser Storage</h2>
            <div className={cn("flex items-start gap-4 p-4 rounded-lg border", isDark ? "bg-white/[0.03] border-white/10" : "bg-slate-50 border-slate-200")}>
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Settings className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm text-slate-600">
                Browser settings can block or delete cookies and clear local/cache storage. Private
                browsing, tracking protection, or extensions may also limit third-party requests.
                Because there is no current Valtriox consent panel, browser and provider controls are
                the available controls for analytics and advertising technologies.
              </p>
            </div>
            <p className="text-slate-600 leading-relaxed mt-3">
              Blocking first-party cookies may prevent login. Clearing local storage may reset theme,
              language, timezone, branding, and browser-local chat or social-post state. Logging out
              expires the <code>vt-*</code> cookies and removes the session hint and core local brand
              keys, but it does not currently remove every preference or feature-content key.
            </p>
          </section>

          <section>
            <h2 className={headingClass}>6. Do Not Track</h2>
            <p className="text-slate-600 leading-relaxed">
              The site does not currently implement a separate response to browser Do Not Track
              signals. Browser-level blocking or deletion controls may still affect cookies,
              local storage, and third-party requests.
            </p>
          </section>

          <section>
            <h2 className={headingClass}>7. Cache Storage and Service Worker</h2>
            <p className="text-slate-600 leading-relaxed">
              A service worker may use browser Cache Storage for selected public static assets and
              navigation support. This cache is not a cookie and does not represent that signed-in
              application data is available offline. The browser or a later application version may
              update or remove cached files, and you can clear them through browser site-data controls.
            </p>
          </section>

          <section>
            <h2 className={headingClass}>8. Changes to This Policy</h2>
            <p className="text-slate-600 leading-relaxed">
              We may revise this policy as the beta, its configuration, or applicable requirements
              change. The revised page will show an updated date. Where practicable and appropriate,
              we may also use available account or email channels for material changes.
            </p>
          </section>

          <section>
            <h2 className={headingClass}>9. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              For questions about this policy or the technologies described here, contact us:
            </p>
            <div className={cn("mt-4 p-6 rounded-lg border", isDark ? "bg-white/[0.03] border-white/10" : "bg-slate-50 border-slate-200")}>
              <div className={isDark ? "space-y-2 text-slate-300" : "space-y-2 text-slate-700"}>
                <p><strong>{identity.companyName} Portal</strong></p>
                <p>
                  Email:{" "}
                  <a href={`mailto:${identity.companyEmail}`} className="text-amber-600 hover:underline">
                    {identity.companyEmail}
                  </a>
                </p>
                <p>Website: {identity.companyWebsite || "valtriox.com"}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
