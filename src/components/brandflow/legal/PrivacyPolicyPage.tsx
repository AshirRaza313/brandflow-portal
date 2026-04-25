"use client";

import { ArrowLeft } from "lucide-react";
import { usePlatformIdentity } from "@/lib/platform-identity";

interface LegalPageProps {
  onBack?: () => void;
}

export function PrivacyPolicyPage({ onBack }: LegalPageProps) {
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
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Privacy Policy
          </h1>
          <p className="text-slate-500 text-sm">
            Last Updated: July 11, 2025
          </p>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              {identity.companyName} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you visit our website and use the {identity.companyName} Portal platform.
              This policy is governed by and shall be construed in accordance with the laws
              of the Islamic Republic of Pakistan.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              1. Information We Collect
            </h2>

            <h3 className="text-lg font-medium text-slate-800 mt-6 mb-2">
              1.1 Personal Information
            </h3>
            <p className="text-slate-600 leading-relaxed">
              When you register for an account, subscribe to our services, or contact us, we may
              collect the following personal information:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>Full name, email address, and phone number</li>
              <li>Business name, address, and registration details</li>
              <li>Billing and payment information (processed through secure third-party payment gateways)</li>
              <li>Team member details you provide for account management</li>
              <li>Customer data you import or manage within the platform (e.g., customer names, contact details, order histories)</li>
              <li>Profile pictures and branding assets you upload</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mt-6 mb-2">
              1.2 Usage Data
            </h3>
            <p className="text-slate-600 leading-relaxed">
              We automatically collect certain information when you access or use our platform,
              including:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>Device information (device type, operating system, browser type and version)</li>
              <li>IP address and approximate geographic location</li>
              <li>Pages visited, time spent on pages, and navigation patterns</li>
              <li>Features used, actions taken, and error logs</li>
              <li>Referral source and search queries that led you to our platform</li>
              <li>Session duration and frequency of visits</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mt-6 mb-2">
              1.3 Cookies and Tracking Technologies
            </h3>
            <p className="text-slate-600 leading-relaxed">
              We use cookies, web beacons, pixel tags, and similar tracking technologies to
              collect and store information about your interactions with our platform. For a
              detailed explanation, please refer to our{" "}
              <span className="text-amber-600 font-medium cursor-pointer hover:underline">Cookie Policy</span>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              2. How We Use Your Information
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li><strong className="text-slate-700">Service Delivery:</strong> To provide, maintain, and improve the {identity.companyName} Portal, process transactions, send order confirmations, and deliver customer support.</li>
              <li><strong className="text-slate-700">Account Management:</strong> To create and manage your account, authenticate your identity, and manage team member access and permissions.</li>
              <li><strong className="text-slate-700">Communication:</strong> To send you service-related notifications, updates, security alerts, and respond to your inquiries.</li>
              <li><strong className="text-slate-700">Analytics and Improvement:</strong> To analyze usage patterns, diagnose technical issues, and improve our platform&apos;s features, performance, and user experience.</li>
              <li><strong className="text-slate-700">Marketing:</strong> With your consent, to send promotional materials, newsletters, and information about new features or services that may interest you. You may opt out at any time.</li>
              <li><strong className="text-slate-700">Security:</strong> To detect, prevent, and address fraud, unauthorized access, and other illegal activities, and to protect the security of our platform and users.</li>
              <li><strong className="text-slate-700">Legal Compliance:</strong> To comply with applicable laws, regulations, legal processes, or enforceable governmental requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              3. Data Sharing and Third Parties
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We do not sell your personal information. We may share your information with
              third parties only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li><strong className="text-slate-700">Service Providers:</strong> We engage trusted third-party service providers who perform services on our behalf, such as cloud hosting (Supabase), payment processing, email delivery, and analytics. These providers are contractually obligated to protect your data and use it only for the purposes we specify.</li>
              <li><strong className="text-slate-700">Integrations:</strong> When you connect {identity.companyName} with third-party services (e.g., WhatsApp Business API, social media platforms, payment gateways), data may be shared with those services in accordance with their own privacy policies.</li>
              <li><strong className="text-slate-700">Business Transfers:</strong> In connection with any merger, acquisition, reorganization, bankruptcy, or sale of assets, your information may be transferred as part of such transaction, subject to continued protection under this policy.</li>
              <li><strong className="text-slate-700">Legal Requirements:</strong> We may disclose your information if required by law, court order, governmental regulation, or subpoena, or if we believe such disclosure is necessary to protect our rights, safety, or property, or that of our users or the public.</li>
              <li><strong className="text-slate-700">With Your Consent:</strong> We may share your information with third parties when you have given us explicit consent to do so.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              4. Data Security and Storage
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We implement industry-standard security measures to protect your personal
              information, including:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>Encryption of data in transit using TLS/SSL protocols</li>
              <li>Encryption of sensitive data at rest</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Secure data backup and disaster recovery procedures</li>
              <li>Employee training on data protection and privacy best practices</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              Your data is stored on secure servers hosted by Supabase (cloud infrastructure
              providers). While we strive to use commercially acceptable means to protect your
              information, no method of transmission over the Internet or electronic storage
              is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              5. Your Rights
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Under applicable Pakistani law, including the Prevention of Electronic Crimes Act
              2016 (PECA) and general principles of data protection, you have the following
              rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li><strong className="text-slate-700">Right of Access:</strong> You may request a copy of the personal information we hold about you.</li>
              <li><strong className="text-slate-700">Right to Correction:</strong> You may request that we correct any inaccurate or incomplete personal information.</li>
              <li><strong className="text-slate-700">Right to Deletion:</strong> You may request that we delete your personal information, subject to certain legal obligations and legitimate business needs. Upon account deletion, we will remove your personal data within 30 days, except where retention is required by law.</li>
              <li><strong className="text-slate-700">Right to Restrict Processing:</strong> You may request that we limit how we use your personal information in certain circumstances.</li>
              <li><strong className="text-slate-700">Right to Data Portability:</strong> You may request to receive your data in a structured, commonly used, and machine-readable format.</li>
              <li><strong className="text-slate-700">Right to Withdraw Consent:</strong> Where processing is based on consent, you may withdraw your consent at any time without affecting the lawfulness of processing carried out prior to withdrawal.</li>
              <li><strong className="text-slate-700">Right to Object:</strong> You may object to certain types of processing, including direct marketing.</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              To exercise any of these rights, please contact us at{" "}
              <a href={`mailto:${identity.companyEmail}`} className="text-amber-600 hover:underline">{identity.companyEmail}</a>. We will respond to your request within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              6. Cookies and Tracking
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We use cookies and similar technologies to enhance your experience, analyze trends,
              and gather demographic information. Our platform uses the following categories of
              cookies:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li><strong className="text-slate-700">Essential Cookies:</strong> Required for the platform to function properly, including authentication, security, and session management.</li>
              <li><strong className="text-slate-700">Performance Cookies:</strong> Help us understand how visitors interact with our platform by collecting anonymous statistical information.</li>
              <li><strong className="text-slate-700">Functionality Cookies:</strong> Remember your preferences and settings to provide a personalized experience.</li>
              <li><strong className="text-slate-700">Marketing Cookies:</strong> Used to deliver relevant advertisements and track campaign effectiveness (only with your consent).</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              You can manage your cookie preferences through your browser settings. Please note
              that disabling certain cookies may affect the functionality of our platform.
              For detailed information, see our{" "}
              <span className="text-amber-600 font-medium cursor-pointer hover:underline">Cookie Policy</span>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              7. Data Retention
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We retain your personal information for as long as your account is active or as
              needed to provide you with our services. We will also retain and use your
              information as necessary to comply with legal obligations, resolve disputes,
              enforce our agreements, and protect our legitimate business interests.
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li><strong className="text-slate-700">Active Account Data:</strong> Retained for the duration of your active subscription and for 90 days after cancellation or expiration.</li>
              <li><strong className="text-slate-700">Transactional Records:</strong> Billing and payment records are retained for a period of 7 years as required under Pakistani tax regulations.</li>
              <li><strong className="text-slate-700">Support Communications:</strong> Retained for 3 years from the date of last interaction.</li>
              <li><strong className="text-slate-700">Marketing Data:</strong> Retained until you withdraw consent or request deletion.</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              Upon account deletion, we will delete or anonymize your personal data within 30
              days, except where retention is required by applicable law or regulation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              8. Children&apos;s Privacy
            </h2>
            <p className="text-slate-600 leading-relaxed">
              {identity.companyName} Portal is not intended for use by individuals under the age of 18.
              We do not knowingly collect personal information from children. If we become
              aware that we have inadvertently collected personal information from a child
              under 18, we will take steps to delete that information as promptly as possible.
              If you believe that a child under 18 has provided us with personal information,
              please contact us at{" "}
              <a href={`mailto:${identity.companyEmail}`} className="text-amber-600 hover:underline">{identity.companyEmail}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              9. International Data Transfers
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Your information may be transferred to and processed in countries other than
              Pakistan. These countries may have data protection laws that differ from those
              in Pakistan. By using our platform, you consent to such transfers. We take
              appropriate safeguards to ensure your data is protected in accordance with this
              Privacy Policy regardless of where it is processed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              10. Changes to This Privacy Policy
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our
              practices, technology, legal requirements, or other factors. When we make
              material changes, we will:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>Post the updated policy on our platform with a revised &quot;Last Updated&quot; date</li>
              <li>Send an email notification to registered users for significant changes</li>
              <li>Display a prominent notice within the platform for material updates</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              Your continued use of the platform after the effective date of any changes
              constitutes your acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              11. Contact Us
            </h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions, concerns, or requests regarding this Privacy Policy
              or our data practices, please contact us:
            </p>
            <div className="mt-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-2 text-slate-700">
                <p><strong>{identity.companyName} Portal</strong></p>
                <p>
                  Email:{" "}
                  <a href={`mailto:${identity.companyEmail}`} className="text-amber-600 hover:underline">{identity.companyEmail}</a>
                </p>
                <p>
                  Support:{" "}
                  <a href={`mailto:${identity.companyEmail}`} className="text-amber-600 hover:underline">{identity.companyEmail}</a>
                </p>
                <p>Website: {identity.companyWebsite || "valtriox.com"}</p>
                <p className="text-sm text-slate-500 mt-3">
                  For data protection inquiries, we aim to respond within 30 working days as
                  required under applicable Pakistani regulations.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
