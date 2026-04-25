"use client";

import { ArrowLeft } from "lucide-react";
import { usePlatformIdentity } from "@/lib/platform-identity";

interface LegalPageProps {
  onBack?: () => void;
}

export function TermsOfServicePage({ onBack }: LegalPageProps) {
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
            Terms of Service
          </h1>
          <p className="text-slate-500 text-sm">
            Last Updated: July 11, 2025 &nbsp;|&nbsp; Effective Date: July 11, 2025
          </p>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              Welcome to {identity.companyName} Portal. These Terms of Service (&quot;Terms&quot;) govern your access
              to and use of the {identity.companyName} Portal platform, website, and related services
              (collectively, the &quot;Services&quot;) operated by {identity.companyName} (&quot;Company,&quot; &quot;we,&quot; &quot;our,&quot;
              or &quot;us&quot;). By accessing or using our Services, you agree to be bound by these
              Terms. If you do not agree, please do not use our Services.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              1. Acceptance of Terms
            </h2>
            <p className="text-slate-600 leading-relaxed">
              By creating an account, accessing, or using the {identity.companyName} Portal, you acknowledge
              that you have read, understood, and agree to be bound by these Terms of Service
              and our{" "}
              <span className="text-amber-600 font-medium cursor-pointer hover:underline">Privacy Policy</span>.
              These Terms constitute a legally binding agreement between you and {identity.companyName}.
            </p>
            <p className="text-slate-600 leading-relaxed mt-3">
              You represent and warrant that: (a) you are at least 18 years of age; (b) you have
              the legal capacity to enter into these Terms; (c) you are not prohibited from using
              the Services under any applicable law; and (d) the information you provide during
              registration is accurate, current, and complete.
            </p>
            <p className="text-slate-600 leading-relaxed mt-3">
              If you are using the Services on behalf of an organization, you represent and
              warrant that you have the authority to bind that organization to these Terms, and
              &quot;you&quot; and &quot;your&quot; will refer to that organization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              2. Service Description
            </h2>
            <p className="text-slate-600 leading-relaxed">
              {identity.companyName} Portal is an all-in-one business operations platform designed to help
              brands and businesses manage their operations efficiently. Our Services include,
              but are not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>Order management and tracking across multiple sales channels</li>
              <li>Product catalog management, pricing, and inventory control</li>
              <li>Customer relationship management (CRM) and loyalty programs</li>
              <li>Sales analytics, reporting, and business intelligence dashboards</li>
              <li>Marketing campaign management (WhatsApp, email, social media)</li>
              <li>Team management, attendance tracking, and payroll</li>
              <li>WhatsApp Business API integration and messaging</li>
              <li>AI-powered business assistance and automation tools</li>
              <li>Third-party integrations and data import/export capabilities</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              We reserve the right to modify, suspend, or discontinue any part of the Services
              at any time, with reasonable notice where practicable. We will make commercially
              reasonable efforts to notify you of material changes that may affect your use of
              the Services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              3. User Accounts and Registration
            </h2>
            <p className="text-slate-600 leading-relaxed">
              To access the full functionality of our Services, you must create an account. When
              registering, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information to keep it accurate</li>
              <li>Maintain the security and confidentiality of your login credentials</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Immediately notify us of any unauthorized use of your account</li>
              <li>Not create multiple accounts for the same business or individual</li>
              <li>Not share your account credentials with unauthorized individuals</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              We reserve the right to suspend or terminate accounts that violate these Terms or
              have been inactive for an extended period (12 months or more), with prior notice
              where practicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              4. Subscription Plans and Payments
            </h2>

            <h3 className="text-lg font-medium text-slate-800 mt-6 mb-2">
              4.1 Plan Selection
            </h3>
            <p className="text-slate-600 leading-relaxed">
              {identity.companyName} offers multiple subscription plans with varying features, limits, and
              pricing. Current plan details, pricing, and features are published on our website
              and may be updated from time to time. Plan changes will take effect at the start
              of your next billing cycle unless otherwise stated.
            </p>

            <h3 className="text-lg font-medium text-slate-800 mt-6 mb-2">
              4.2 Free Trial
            </h3>
            <p className="text-slate-600 leading-relaxed">
              New users may be eligible for a 14-day free trial of the platform. During the
              trial period, you will have access to the features of your selected plan. No
              payment is required during the trial. At the end of the trial, you must subscribe
              to a paid plan to continue using the Services. We will send a reminder before
              your trial expires.
            </p>

            <h3 className="text-lg font-medium text-slate-800 mt-6 mb-2">
              4.3 Payment Terms
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Subscription fees are billed in advance according to the billing cycle selected
              (monthly or annual). Payments are processed through our authorized payment
              channels. You are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>Providing accurate and complete billing information</li>
              <li>Paying all fees on time and in full</li>
              <li>Keeping your payment method information up to date</li>
              <li>All applicable taxes, duties, and government charges</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              Subscription fees are quoted in Pakistani Rupees (PKR) unless otherwise specified.
              All prices are exclusive of applicable taxes unless stated otherwise.
            </p>

            <h3 className="text-lg font-medium text-slate-800 mt-6 mb-2">
              4.4 Late Payments
            </h3>
            <p className="text-slate-600 leading-relaxed">
              If payment is not received within 7 days of the due date, we may suspend your
              access to the Services until payment is made. Repeated failure to pay may result
              in account termination. We reserve the right to charge late fees as permitted
              under applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              5. Acceptable Use Policy
            </h2>
            <p className="text-slate-600 leading-relaxed">
              You agree not to use the Services in any way that:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>Violates any applicable law, regulation, or third-party right</li>
              <li>Is fraudulent, misleading, deceptive, or unlawful</li>
              <li>Infringes upon or misappropriates any intellectual property right</li>
              <li>Harasses, threatens, intimidates, or harms any individual or group</li>
              <li>Distributes spam, unsolicited messages, or malicious content</li>
              <li>Transmits viruses, malware, or any code of a destructive nature</li>
              <li>Attempts to gain unauthorized access to our systems or other users&apos; accounts</li>
              <li>Interferes with or disrupts the integrity or performance of the Services</li>
              <li>Uses automated means (bots, scrapers) to access the Services without authorization</li>
              <li>Attempts to reverse engineer, decompile, or disassemble any part of the Services</li>
              <li>Uses the Services to compete directly with {identity.companyName} or build a similar product</li>
              <li>Shares your account access with unauthorized third parties</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              We reserve the right to investigate and take appropriate action against anyone
              who, in our sole discretion, violates this provision, including removing offending
              content, suspending or terminating the account, and reporting to law enforcement
              authorities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              6. Intellectual Property
            </h2>
            <p className="text-slate-600 leading-relaxed">
              The {identity.companyName} Portal, including its software, design, logos, trademarks, service
              marks, trade names, content, and documentation (collectively, &quot;{identity.companyName} IP&quot;),
              are owned by or licensed to {identity.companyName} and are protected by Pakistani and
              international intellectual property laws.
            </p>
            <p className="text-slate-600 leading-relaxed mt-3">
              Your use of the Services does not transfer any ownership rights to you. You are
              granted a limited, non-exclusive, non-transferable, revocable license to use
              the Services solely for their intended purpose during the term of your subscription.
            </p>
            <p className="text-slate-600 leading-relaxed mt-3">
              You retain all rights to the data and content you upload to the platform
              (your &quot;User Content&quot;). By uploading User Content, you grant us a limited license
              to process, store, and use such content solely for the purpose of providing the
              Services to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              7. Data Ownership
            </h2>
            <p className="text-slate-600 leading-relaxed">
              You retain full ownership of all data you create, upload, or manage within the
              {identity.companyName} Portal (&quot;Your Data&quot;). We do not claim any ownership rights over Your Data.
            </p>
            <p className="text-slate-600 leading-relaxed mt-3">
              You grant {identity.companyName} a non-exclusive, worldwide, royalty-free license to host,
              store, process, and transmit Your Data solely for the purpose of providing and
              improving the Services. We will not use Your Data for any other purpose without
              your explicit consent, except as required by law.
            </p>
            <p className="text-slate-600 leading-relaxed mt-3">
              Upon termination of your account, you may request a full export of Your Data within
              30 days. After this period, Your Data will be permanently deleted in accordance
              with our data retention policies, subject to any legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              8. Service Availability and SLA
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We strive to maintain high availability of the Services. Our target uptime is
              99.5% per calendar month, excluding scheduled maintenance windows. Scheduled
              maintenance will be performed during off-peak hours (typically weekends, Pakistan
              Standard Time) with at least 48 hours&apos; advance notice via email or in-app notification.
            </p>
            <p className="text-slate-600 leading-relaxed mt-3">
              The Service Level Agreement (SLA) applies to paying subscribers and includes:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li><strong className="text-slate-700">Uptime Commitment:</strong> 99.5% availability per month (excluding scheduled maintenance)</li>
              <li><strong className="text-slate-700">Response Time:</strong> Critical issues will be acknowledged within 4 hours during business hours</li>
              <li><strong className="text-slate-700">Support Hours:</strong> Monday to Friday, 9:00 AM to 6:00 PM Pakistan Standard Time (PKT)</li>
              <li><strong className="text-slate-700">Credit for Downtime:</strong> If uptime falls below 99.5%, subscribers may be eligible for service credits equal to 10% of the monthly subscription fee for each 0.5% below the SLA threshold</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              This SLA does not apply to downtime caused by factors beyond our reasonable control,
              including but not limited to force majeure events, third-party service outages,
              internet connectivity issues, or your own equipment or software.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              9. Limitation of Liability
            </h2>
            <p className="text-slate-600 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.</li>
              <li>{identity.companyName.toUpperCase()} DOES NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE FROM VIRUSES OR OTHER HARMFUL COMPONENTS.</li>
              <li>IN NO EVENT SHALL {identity.companyName.toUpperCase()}, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, REGARDLESS OF WHETHER SUCH DAMAGES ARE BASED ON CONTRACT, TORT, STRICT LIABILITY, OR ANY OTHER THEORY.</li>
              <li>OUR TOTAL AGGREGATE LIABILITY FOR ANY CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICES SHALL NOT EXCEED THE TOTAL FEES PAID BY YOU TO {identity.companyName.toUpperCase()} DURING THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              These limitations apply to the fullest extent permitted under the laws of the
              Islamic Republic of Pakistan, even if any remedy fails of its essential purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              10. Termination
            </h2>

            <h3 className="text-lg font-medium text-slate-800 mt-6 mb-2">
              10.1 Termination by You
            </h3>
            <p className="text-slate-600 leading-relaxed">
              You may cancel your subscription at any time through your account settings or by
              contacting our support team. Upon cancellation, your access to paid features will
              continue until the end of the current billing period. No prorated refunds will be
              provided for unused time in the current billing cycle, unless otherwise required
              by applicable law or our{" "}
              <span className="text-amber-600 font-medium cursor-pointer hover:underline">Refund Policy</span>.
            </p>

            <h3 className="text-lg font-medium text-slate-800 mt-6 mb-2">
              10.2 Termination by {identity.companyName}
            </h3>
            <p className="text-slate-600 leading-relaxed">
              We may suspend or terminate your account and access to the Services:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>For material breach of these Terms, after providing reasonable notice and an opportunity to cure (except in cases of severe breach or illegal activity)</li>
              <li>If required by law, regulation, or legal process</li>
              <li>If we reasonably believe your use of the Services poses a security risk to us or other users</li>
              <li>If your subscription payment fails and is not remedied within 14 days</li>
              <li>If we discontinue the Services or a particular plan permanently</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mt-6 mb-2">
              10.3 Effect of Termination
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Upon termination: (a) your right to use the Services will cease immediately;
              (b) provisions that by their nature should survive termination will remain in effect;
              and (c) we will retain your data for 30 days to allow you to export it, after which
              it will be permanently deleted subject to our data retention obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              11. Indemnification
            </h2>
            <p className="text-slate-600 leading-relaxed">
              You agree to indemnify, defend, and hold harmless {identity.companyName} and its officers,
              directors, employees, agents, licensors, and suppliers from and against any claims,
              actions, demands, liabilities, and settlements including legal fees arising out of
              or related to: (a) your use or misuse of the Services; (b) your violation of these
              Terms; (c) your violation of any applicable law or third-party right; (d) your User
              Content; or (e) any dispute between you and another user of the Services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              12. Dispute Resolution and Governing Law
            </h2>
            <p className="text-slate-600 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the
              Islamic Republic of Pakistan, without regard to its conflict of law principles.
            </p>
            <p className="text-slate-600 leading-relaxed mt-3">
              Any dispute arising out of or relating to these Terms or the Services shall first
              be submitted to good-faith negotiation between the parties. If the dispute cannot
              be resolved within 30 days through negotiation, either party may submit the dispute
              to binding arbitration administered under the rules of the Pakistani Arbitration
              Act 1940. The arbitration shall be conducted in English, and the seat of arbitration
              shall be Lahore, Pakistan.
            </p>
            <p className="text-slate-600 leading-relaxed mt-3">
              Notwithstanding the above, either party may seek injunctive or equitable relief in
              any court of competent jurisdiction in Lahore, Pakistan to prevent the actual or
              threatened infringement, misappropriation, or violation of intellectual property
              rights or confidentiality obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              13. Changes to Terms
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We reserve the right to modify these Terms at any time. When we make material changes:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>We will update the &quot;Last Updated&quot; date at the top of these Terms</li>
              <li>We will provide at least 30 days&apos; advance notice via email or in-app notification</li>
              <li>Your continued use of the Services after the effective date constitutes acceptance of the changes</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              If you disagree with any changes, you must stop using the Services and cancel your
              subscription before the changes take effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              14. General Provisions
            </h2>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li><strong className="text-slate-700">Entire Agreement:</strong> These Terms, together with the Privacy Policy, Refund Policy, and Cookie Policy, constitute the entire agreement between you and {identity.companyName} regarding the Services.</li>
              <li><strong className="text-slate-700">Severability:</strong> If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.</li>
              <li><strong className="text-slate-700">Waiver:</strong> The failure of either party to enforce any right or provision of these Terms will not constitute a waiver of such right or provision.</li>
              <li><strong className="text-slate-700">Assignment:</strong> You may not assign or transfer these Terms or your rights hereunder without our prior written consent. We may assign our rights and obligations without restriction.</li>
              <li><strong className="text-slate-700">Force Majeure:</strong> Neither party shall be liable for any failure to perform its obligations where such failure is caused by circumstances beyond its reasonable control, including natural disasters, war, terrorism, riots, epidemics, or government actions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              15. Contact Us
            </h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="mt-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-2 text-slate-700">
                <p><strong>{identity.companyName} Portal</strong></p>
                <p>
                  Legal Inquiries:{" "}
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
