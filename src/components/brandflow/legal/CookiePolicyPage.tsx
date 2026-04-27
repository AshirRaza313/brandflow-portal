"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { ArrowLeft, Shield, Globe, Database, BarChart3, Eye, Settings, RefreshCw, Mail } from "lucide-react";
import { usePlatformIdentity } from "@/lib/platform-identity";

interface LegalPageProps {
  onBack?: () => void;
}

export function CookiePolicyPage({ onBack }: LegalPageProps) {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme === "dark" || appTheme === "premium-dark";
  const { identity } = usePlatformIdentity();
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-amber-600 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to {identity.companyName}
        </button>

        {/* Header */}
        <div className="mb-10">
          <h1 className={isDark ? "text-3xl sm:text-4xl font-bold text-white mb-3" : "text-3xl sm:text-4xl font-bold text-slate-900 mb-3"}>
            Cookie Policy
          </h1>
          <p className="text-slate-500 text-sm">
            Last Updated: July 11, 2025
          </p>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              This Cookie Policy explains how {identity.companyName} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) uses cookies
              and similar tracking technologies when you visit our website and use the {identity.companyName}
              Portal platform. This policy should be read alongside our{" "}
              <span className="text-amber-600 font-medium cursor-pointer hover:underline">Privacy Policy</span>,
              which provides more general information about how we handle your personal data.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className={isDark ? "text-xl font-semibold text-white mb-3 pb-2 border-b border-slate-200" : "text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200"}>
              1. What Are Cookies
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Cookies are small text files that are stored on your device (computer, tablet, or
              mobile phone) when you visit a website. They are widely used to make websites work
              more efficiently, provide a better user experience, and supply information to the
              website owners.
            </p>
            <p className="text-slate-600 leading-relaxed mt-3">
              Cookies serve various purposes. They help websites remember your preferences,
              understand how you use the site, and improve your overall experience. Cookies can
              be &quot;persistent&quot; (remaining on your device until they expire or you delete them)
              or &quot;session&quot; cookies (deleted automatically when you close your browser).
            </p>
            <p className="text-slate-600 leading-relaxed mt-3">
              In addition to cookies, we may also use similar technologies such as:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li><strong className={isDark ? "text-slate-300" : "text-slate-700"}>Web Beacons (Pixel Tags):</strong> Small transparent images embedded in emails and web pages that help us track email opens and page views</li>
              <li><strong className={isDark ? "text-slate-300" : "text-slate-700"}>Local Storage:</strong> Browser-based storage that allows us to store data locally on your device for faster access</li>
              <li><strong className={isDark ? "text-slate-300" : "text-slate-700"}>Session Storage:</strong> Similar to local storage but data is cleared when the browser session ends</li>
            </ul>
          </section>

          <section>
            <h2 className={isDark ? "text-xl font-semibold text-white mb-3 pb-2 border-b border-slate-200" : "text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200"}>
              2. How We Use Cookies
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We use cookies for the following purposes on the {identity.companyName} Portal:
            </p>

            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className={isDark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-900"}>Authentication & Security</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    We use cookies to verify your identity, maintain your logged-in session, and protect your account from unauthorized access. These cookies are essential for the platform to function securely.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className={isDark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-900"}>Preferences & Settings</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Cookies remember your language preference, theme selection, sidebar state, and other personalization settings so you don&apos;t need to reconfigure them each time you visit.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className={isDark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-900"}>Analytics & Performance</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    We use analytics cookies to understand how visitors interact with our platform, which pages are most visited, how long users spend on features, and where they encounter errors. This helps us improve the user experience and optimize performance.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className={isDark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-900"}>Marketing & Communication</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    With your consent, we may use cookies to deliver relevant content, measure the effectiveness of our marketing campaigns, and provide personalized recommendations based on your usage patterns.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className={isDark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-900"}>Functionality</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Cookies enable certain features of the platform, such as form auto-fill, recently viewed items, multi-page navigation state, and integration with third-party services like WhatsApp Business API.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className={isDark ? "text-xl font-semibold text-white mb-3 pb-2 border-b border-slate-200" : "text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200"}>
              3. Types of Cookies We Use
            </h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className={isDark ? "text-left p-3 font-semibold text-white border border-slate-200 rounded-tl-lg" : "text-left p-3 font-semibold text-slate-900 border border-slate-200 rounded-tl-lg"}>Cookie Category</th>
                    <th className={isDark ? "text-left p-3 font-semibold text-white border border-slate-200" : "text-left p-3 font-semibold text-slate-900 border border-slate-200"}>Purpose</th>
                    <th className={isDark ? "text-left p-3 font-semibold text-white border border-slate-200" : "text-left p-3 font-semibold text-slate-900 border border-slate-200"}>Duration</th>
                    <th className={isDark ? "text-left p-3 font-semibold text-white border border-slate-200 rounded-tr-lg" : "text-left p-3 font-semibold text-slate-900 border border-slate-200 rounded-tr-lg"}>Can Be Disabled?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className={isDark ? "p-3 font-medium text-slate-200 border border-slate-200" : "p-3 font-medium text-slate-800 border border-slate-200"}>Essential / Strictly Necessary</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Authentication, session management, security, CSRF protection</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Session to 30 days</td>
                    <td className="p-3 text-slate-600 border border-slate-200"><span className="text-red-600 font-medium">No</span> — Required for platform to function</td>
                  </tr>
                  <tr>
                    <td className={isDark ? "p-3 font-medium text-slate-200 border border-slate-200" : "p-3 font-medium text-slate-800 border border-slate-200"}>Performance / Analytics</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Page views, feature usage, error tracking, load times</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Up to 2 years</td>
                    <td className="p-3 text-slate-600 border border-slate-200"><span className="text-amber-600 font-medium">Yes</span></td>
                  </tr>
                  <tr>
                    <td className={isDark ? "p-3 font-medium text-slate-200 border border-slate-200" : "p-3 font-medium text-slate-800 border border-slate-200"}>Functionality</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Language, theme, preferences, recently viewed items</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Up to 1 year</td>
                    <td className="p-3 text-slate-600 border border-slate-200"><span className="text-amber-600 font-medium">Yes</span></td>
                  </tr>
                  <tr>
                    <td className={isDark ? "p-3 font-medium text-slate-200 border border-slate-200" : "p-3 font-medium text-slate-800 border border-slate-200"}>Marketing / Advertising</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Ad targeting, campaign tracking, remarketing</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Up to 2 years</td>
                    <td className="p-3 text-slate-600 border border-slate-200"><span className="text-amber-600 font-medium">Yes</span> — Only set with your consent</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className={isDark ? "text-lg font-medium text-slate-200 mt-8 mb-2" : "text-lg font-medium text-slate-800 mt-8 mb-2"}>
              3.1 Essential Cookies
            </h3>
            <p className="text-slate-600 leading-relaxed">
              These cookies are necessary for the platform to function properly. They cannot be
              disabled as the platform would not work without them.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className={isDark ? "text-left p-3 font-semibold text-white border border-slate-200" : "text-left p-3 font-semibold text-slate-900 border border-slate-200"}>Cookie Name</th>
                    <th className={isDark ? "text-left p-3 font-semibold text-white border border-slate-200" : "text-left p-3 font-semibold text-slate-900 border border-slate-200"}>Purpose</th>
                    <th className={isDark ? "text-left p-3 font-semibold text-white border border-slate-200" : "text-left p-3 font-semibold text-slate-900 border border-slate-200"}>Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className={isDark ? "p-3 text-slate-300 border border-slate-200 font-mono text-xs" : "p-3 text-slate-700 border border-slate-200 font-mono text-xs"}>next-auth.session-token</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Maintains your authenticated session</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Session</td>
                  </tr>
                  <tr>
                    <td className={isDark ? "p-3 text-slate-300 border border-slate-200 font-mono text-xs" : "p-3 text-slate-700 border border-slate-200 font-mono text-xs"}>next-auth.csrf-token</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Prevents Cross-Site Request Forgery attacks</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Session</td>
                  </tr>
                  <tr>
                    <td className={isDark ? "p-3 text-slate-300 border border-slate-200 font-mono text-xs" : "p-3 text-slate-700 border border-slate-200 font-mono text-xs"}>next-auth.callback-url</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Stores the URL to redirect to after authentication</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Session</td>
                  </tr>
                  <tr>
                    <td className={isDark ? "p-3 text-slate-300 border border-slate-200 font-mono text-xs" : "p-3 text-slate-700 border border-slate-200 font-mono text-xs"}>bf_theme</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Stores your UI theme preference (light/dark/premium-dark)</td>
                    <td className="p-3 text-slate-600 border border-slate-200">1 year</td>
                  </tr>
                  <tr>
                    <td className={isDark ? "p-3 text-slate-300 border border-slate-200 font-mono text-xs" : "p-3 text-slate-700 border border-slate-200 font-mono text-xs"}>bf_lang</td>
                    <td className="p-3 text-slate-600 border border-slate-200">Stores your language preference</td>
                    <td className="p-3 text-slate-600 border border-slate-200">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className={isDark ? "text-xl font-semibold text-white mb-3 pb-2 border-b border-slate-200" : "text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200"}>
              4. Third-Party Cookies
            </h2>
            <p className="text-slate-600 leading-relaxed">
              In addition to our own cookies, the following third-party services may set cookies
              when you interact with {identity.companyName} Portal:
            </p>

            <h3 className={isDark ? "text-lg font-medium text-slate-200 mt-6 mb-2" : "text-lg font-medium text-slate-800 mt-6 mb-2"}>
              4.1 Google Analytics
            </h3>
            <p className="text-slate-600 leading-relaxed">
              We use Google Analytics to understand how visitors use our platform. Google Analytics
              uses cookies to collect information about how visitors interact with our site, such as
              pages visited, time spent, and navigation patterns. This data is aggregated and
              anonymized. For more information, visit{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                Google&apos;s Privacy Policy
              </a>.
            </p>

            <h3 className={isDark ? "text-lg font-medium text-slate-200 mt-6 mb-2" : "text-lg font-medium text-slate-800 mt-6 mb-2"}>
              4.2 Supabase
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Our database and authentication services are powered by Supabase, which may set
              cookies for session management and authentication purposes. For more information,
              visit{" "}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                Supabase&apos;s Privacy Policy
              </a>.
            </p>

            <h3 className={isDark ? "text-lg font-medium text-slate-200 mt-6 mb-2" : "text-lg font-medium text-slate-800 mt-6 mb-2"}>
              4.3 Payment Processors
            </h3>
            <p className="text-slate-600 leading-relaxed">
              When you make a payment, our payment processors (such as JazzCash, EasyPaisa, or
              bank partners) may set their own cookies to facilitate secure transaction processing.
              These cookies are governed by the respective payment processor&apos;s privacy and
              cookie policies.
            </p>

            <h3 className={isDark ? "text-lg font-medium text-slate-200 mt-6 mb-2" : "text-lg font-medium text-slate-800 mt-6 mb-2"}>
              4.4 Social Media and Communication Platforms
            </h3>
            <p className="text-slate-600 leading-relaxed">
              If you use our WhatsApp integration or connect social media accounts, the
              respective platforms (Meta/WhatsApp, Facebook, Instagram, Twitter/X) may set
              cookies through embedded content or integration features. These cookies are subject
              to each platform&apos;s own policies.
            </p>

            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> {identity.companyName} does not control the cookies set by third-party
                services. We encourage you to review the privacy and cookie policies of these
                third-party providers for more information about their cookie practices.
              </p>
            </div>
          </section>

          <section>
            <h2 className={isDark ? "text-xl font-semibold text-white mb-3 pb-2 border-b border-slate-200" : "text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200"}>
              5. Managing Cookie Preferences
            </h2>
            <p className="text-slate-600 leading-relaxed">
              You have the right to decide whether to accept or reject cookies. Here are the
              ways you can manage your cookie preferences:
            </p>

            <h3 className={isDark ? "text-lg font-medium text-slate-200 mt-6 mb-2" : "text-lg font-medium text-slate-800 mt-6 mb-2"}>
              5.1 Browser Settings
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Most web browsers allow you to control cookies through their settings. You can set
              your browser to refuse all cookies, accept only first-party cookies, or delete
              cookies when you close your browser. Here&apos;s how to manage cookies in common browsers:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li><strong className={isDark ? "text-slate-300" : "text-slate-700"}>Google Chrome:</strong> Settings &rarr; Privacy and Security &rarr; Cookies and other site data</li>
              <li><strong className={isDark ? "text-slate-300" : "text-slate-700"}>Mozilla Firefox:</strong> Settings &rarr; Privacy &amp; Security &rarr; Cookies and Site Data</li>
              <li><strong className={isDark ? "text-slate-300" : "text-slate-700"}>Safari:</strong> Preferences &rarr; Privacy &rarr; Manage Website Data</li>
              <li><strong className={isDark ? "text-slate-300" : "text-slate-700"}>Microsoft Edge:</strong> Settings &rarr; Cookies and site permissions &rarr; Manage and delete cookies</li>
            </ul>

            <h3 className={isDark ? "text-lg font-medium text-slate-200 mt-6 mb-2" : "text-lg font-medium text-slate-800 mt-6 mb-2"}>
              5.2 Cookie Consent Banner
            </h3>
            <p className="text-slate-600 leading-relaxed">
              When you first visit {identity.companyName} Portal, we display a cookie consent banner that
              allows you to:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>Accept all cookies</li>
              <li>Reject non-essential cookies (accept only essential cookies)</li>
              <li>Customize your preferences by cookie category</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              You can update your cookie preferences at any time through the cookie settings
              accessible from the footer of our website or through your account settings.
            </p>

            <h3 className={isDark ? "text-lg font-medium text-slate-200 mt-6 mb-2" : "text-lg font-medium text-slate-800 mt-6 mb-2"}>
              5.3 Opt-Out Links
            </h3>
            <p className="text-slate-600 leading-relaxed">
              For specific third-party tracking services, you can opt out directly:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>Google Analytics:{" "}
                <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                  Google Analytics Opt-out Browser Add-on
                </a>
              </li>
              <li>Google Ads (if applicable):{" "}
                <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                  Google Ads Settings
                </a>
              </li>
            </ul>

            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> Disabling or rejecting certain cookies may affect the
                functionality of the {identity.companyName} Portal. Essential cookies cannot be disabled as they
                are required for the platform to operate securely. If you disable performance or
                functionality cookies, some features may not work as intended.
              </p>
            </div>
          </section>

          <section>
            <h2 className={isDark ? "text-xl font-semibold text-white mb-3 pb-2 border-b border-slate-200" : "text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200"}>
              6. Do Not Track
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Some browsers offer a &quot;Do Not Track&quot; (DNT) feature that signals to websites that
              you do not want to be tracked. Currently, there is no industry standard for how
              websites should respond to DNT signals. While we respect your privacy preferences,
              our platform does not currently respond to DNT signals. Instead, we provide the
              cookie consent mechanism described above for you to control your tracking preferences.
            </p>
          </section>

          <section>
            <h2 className={isDark ? "text-xl font-semibold text-white mb-3 pb-2 border-b border-slate-200" : "text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200"}>
              7. Similar Technologies
            </h2>
            <p className="text-slate-600 leading-relaxed">
              In addition to cookies, we may use the following technologies for similar purposes:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li><strong className={isDark ? "text-slate-300" : "text-slate-700"}>LocalStorage:</strong> Used to store your theme preference, language, sidebar state, and other UI settings for a better experience across sessions.</li>
              <li><strong className={isDark ? "text-slate-300" : "text-slate-700"}>SessionStorage:</strong> Used for temporary data needed during a single browser session, such as form state and multi-step navigation data.</li>
              <li><strong className={isDark ? "text-slate-300" : "text-slate-700"}>IndexedDB:</strong> May be used for client-side caching of frequently accessed data to improve platform performance and reduce load times.</li>
              <li><strong className={isDark ? "text-slate-300" : "text-slate-700"}>Service Workers:</strong> Used to enable offline capabilities and improve performance through intelligent caching of static assets.</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              These technologies function similarly to cookies and are subject to the same consent
              requirements described in this policy.
            </p>
          </section>

          <section>
            <h2 className={isDark ? "text-xl font-semibold text-white mb-3 pb-2 border-b border-slate-200" : "text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200"}>
              8. Changes to This Cookie Policy
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in the
              cookies we use, changes in technology, or for other operational, legal, or
              regulatory reasons. When we make changes:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>We will update the &quot;Last Updated&quot; date at the top of this page</li>
              <li>We will update the cookie consent banner if new cookie categories are introduced</li>
              <li>We will notify registered users via email for material changes affecting data collection practices</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              We encourage you to review this Cookie Policy periodically to stay informed about
              how we use cookies and related technologies.
            </p>
          </section>

          <section>
            <h2 className={isDark ? "text-xl font-semibold text-white mb-3 pb-2 border-b border-slate-200" : "text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200"}>
              9. Contact Us
            </h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about our use of cookies or this Cookie Policy,
              please contact us:
            </p>
            <div className="mt-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
              <div className={isDark ? "space-y-2 text-slate-300" : "space-y-2 text-slate-700"}>
                <p><strong>{identity.companyName} Portal</strong></p>
                <p>
                  Privacy Inquiries:{" "}
                  <a href={`mailto:${identity.companyEmail}`} className="text-amber-600 hover:underline">{identity.companyEmail}</a>
                </p>
                <p>
                  Support:{" "}
                  <a href={`mailto:${identity.companyEmail}`} className="text-amber-600 hover:underline">{identity.companyEmail}</a>
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
