"use client";

import { ArrowLeft } from "lucide-react";
import { usePlatformIdentity } from "@/lib/platform-identity";

interface LegalPageProps {
  onBack?: () => void;
}

export function RefundPolicyPage({ onBack }: LegalPageProps) {
  const { identity } = usePlatformIdentity();
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to {identity.companyName}
        </button>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Refund Policy
          </h1>
          <p className="text-slate-500 text-sm">
            Last Updated: July 11, 2025
          </p>
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-800">
              At {identity.companyName}, we are committed to providing a high-quality platform and fair
              transaction practices. This Refund Policy outlines the circumstances under which
              refunds may be issued, the process for requesting a refund, and any applicable
              exceptions. All transactions and refunds are governed by the laws of the Islamic
              Republic of Pakistan.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              1. Subscription Refund Policy
            </h2>
            <p className="text-slate-600 leading-relaxed">
              {identity.companyName} Portal operates on a subscription-based model. Our refund policy for
              subscription payments is as follows:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li><strong className="text-slate-700">Monthly Subscriptions:</strong> Refund requests for monthly subscriptions must be submitted within 7 days of the payment date. If approved, a prorated refund will be issued for the unused portion of the billing period.</li>
              <li><strong className="text-slate-700">Annual Subscriptions:</strong> Refund requests for annual subscriptions must be submitted within 14 days of the payment date. If approved, a prorated refund will be issued for the remaining unused months, minus a 10% early cancellation processing fee.</li>
              <li><strong className="text-slate-700">Plan Upgrades:</strong> When upgrading from a lower-tier plan to a higher-tier plan, the price difference for the remaining billing period will be charged. No refund is provided for downgrading; the new plan will take effect at the start of the next billing cycle.</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              Refunds will be processed using the same payment method that was used for the
              original transaction, unless otherwise agreed upon.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              2. 14-Day Free Trial
            </h2>
            <p className="text-slate-600 leading-relaxed">
              {identity.companyName} offers a 14-day free trial for new users to explore the platform&apos;s
              features before committing to a paid subscription. The following terms apply:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>No payment information is required to start the free trial</li>
              <li>You will have full access to all features of your selected plan during the trial period</li>
              <li>We will send reminder notifications at 7 days and 1 day before the trial expires</li>
              <li>You must explicitly subscribe to a paid plan to continue using the Services after the trial ends</li>
              <li>No charges will be incurred during the trial period</li>
              <li>There is no automatic conversion to a paid plan without your explicit consent</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              If you do not wish to continue after the trial, no action is required on your part.
              Your account will remain accessible in a limited, read-only mode for 30 days to allow
              you to export your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              3. Refund Eligibility
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Refund requests are evaluated on a case-by-case basis. The following criteria
              determine refund eligibility:
            </p>

            <div className="mt-4">
              <h3 className="text-lg font-medium text-slate-800 mb-2">
                3.1 Eligible for Refund
              </h3>
              <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-2">
                <li>Duplicate payment made due to a technical error (full refund)</li>
                <li>Service outage exceeding 24 consecutive hours affecting core functionality (prorated credit or refund)</li>
                <li>Unauthorized charges confirmed by our security team (full refund)</li>
                <li>Charges made after a valid cancellation request was submitted (full refund)</li>
                <li>Significant deviation from advertised features or functionality (case-by-case evaluation)</li>
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium text-slate-800 mb-2">
                3.2 Not Eligible for Refund
              </h3>
              <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-2">
                <li>Refund requests submitted after the applicable time window (7 days for monthly, 14 days for annual)</li>
                <li>Issues caused by the user&apos;s own equipment, software, or internet connectivity</li>
                <li>Service interruptions caused by third-party providers or force majeure events</li>
                <li>Dissatisfaction with the user interface or subjective design preferences</li>
                <li>Failure to read documentation or use the platform as intended</li>
                <li>Account suspended or terminated for violation of the Terms of Service</li>
                <li>Purchases made through promotional pricing or special discount offers (unless otherwise stated in the promotion terms)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              4. How to Request a Refund
            </h2>
            <p className="text-slate-600 leading-relaxed">
              To request a refund, please follow these steps:
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-slate-600 mt-3">
              <li>
                <strong className="text-slate-700">Email Request:</strong> Send a refund request to{" "}
                <a href={`mailto:${identity.companyEmail}`} className="text-emerald-600 hover:underline">{identity.companyEmail}</a>{" "}
                with the subject line &quot;Refund Request - [Your Organization Name]&quot;.
              </li>
              <li>
                <strong className="text-slate-700">Required Information:</strong> Include the following in your request:
                <ul className="list-disc pl-5 mt-1.5 space-y-1">
                  <li>Registered email address and organization name</li>
                  <li>Subscription plan and billing period in question</li>
                  <li>Transaction reference number or payment proof</li>
                  <li>Reason for the refund request</li>
                  <li>Any supporting documentation (e.g., screenshots, correspondence)</li>
                </ul>
              </li>
              <li>
                <strong className="text-slate-700">Acknowledgment:</strong> We will acknowledge receipt of your refund request within 2 business days.
              </li>
              <li>
                <strong className="text-slate-700">Review Period:</strong> Our billing team will review your request and respond with a decision within 7 business days.
              </li>
              <li>
                <strong className="text-slate-700">Communication:</strong> All refund-related communications will be sent to your registered email address.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              5. Processing Time
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Once a refund is approved, the processing timeline is as follows:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li><strong className="text-slate-700">Bank Transfer:</strong> 7 to 14 business days from the date of approval</li>
              <li><strong className="text-slate-700">JazzCash / EasyPaisa:</strong> 3 to 5 business days from the date of approval</li>
              <li><strong className="text-slate-700">Credit/Debit Card:</strong> 5 to 10 business days from the date of approval, depending on your bank</li>
              <li><strong className="text-slate-700">Service Credits:</strong> Applied within 1 business day of approval</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              Processing times are estimates and may vary depending on your financial institution
              and any intermediary banks involved in the transaction. We will provide you with a
              refund confirmation email once the refund has been initiated from our end.
            </p>
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> {identity.companyName} is not responsible for delays caused by
                your bank or payment provider. If you have not received your refund within the
                stated timeframes, please contact your financial institution directly before
                reaching out to us.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              6. Non-Refundable Items
            </h2>
            <p className="text-slate-600 leading-relaxed">
              The following are not eligible for refunds under any circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li><strong className="text-slate-700">Custom Development Work:</strong> Any custom features, integrations, or development work specifically commissioned for your organization</li>
              <li><strong className="text-slate-700">Domain Registration Fees:</strong> Fees paid for custom domain registration or renewal through our platform</li>
              <li><strong className="text-slate-700">Third-Party Service Costs:</strong> Costs incurred for third-party services (e.g., WhatsApp Business API charges, SMS gateway fees) that are passed through to you at cost</li>
              <li><strong className="text-slate-700">Setup or Onboarding Fees:</strong> One-time setup, onboarding, or data migration fees, unless the service was not delivered</li>
              <li><strong className="text-slate-700">Promotional or Discounted Subscriptions:</strong> Subscriptions purchased at a discounted rate through special promotions, unless otherwise stated in the promotion terms</li>
              <li><strong className="text-slate-700">Partial Month Usage:</strong> For monthly subscriptions, refunds are not provided for partial month usage beyond the 7-day refund window</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              7. Cancellation Policy
            </h2>

            <h3 className="text-lg font-medium text-slate-800 mt-6 mb-2">
              7.1 How to Cancel
            </h3>
            <p className="text-slate-600 leading-relaxed">
              You may cancel your subscription at any time through the following methods:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li><strong className="text-slate-700">Self-Service:</strong> Navigate to Settings &rarr; Billing &amp; Plans in your {identity.companyName} Portal dashboard and select &quot;Cancel Subscription&quot;</li>
              <li><strong className="text-slate-700">Email:</strong> Send a cancellation request to{" "}
                <a href={`mailto:${identity.companyEmail}`} className="text-emerald-600 hover:underline">{identity.companyEmail}</a>
              </li>
              <li><strong className="text-slate-700">WhatsApp:</strong> Contact our support team via WhatsApp at the number provided in your account settings</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mt-6 mb-2">
              7.2 What Happens After Cancellation
            </h3>
            <p className="text-slate-600 leading-relaxed">
              When you cancel your subscription:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>Your access to paid features will continue until the end of your current billing period</li>
              <li>No further charges will be made after the current billing period ends</li>
              <li>Your data will be preserved for 30 days in read-only mode, allowing you to export your information</li>
              <li>After 30 days, your account data will be permanently deleted in accordance with our data retention policies</li>
              <li>You can reactivate your subscription at any time within the 30-day retention period by logging in and selecting a new plan</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-800 mt-6 mb-2">
              7.3 Early Termination of Annual Plans
            </h3>
            <p className="text-slate-600 leading-relaxed">
              If you cancel an annual subscription before the end of the annual period:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>Access continues until the end of the annual period unless you specifically request immediate termination</li>
              <li>No prorated refund is provided for the remaining months, except as described in Section 1 of this policy</li>
              <li>If the refund eligibility criteria in Section 1 are met, a prorated refund minus the 10% early cancellation fee will be processed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              8. Disputes and Appeals
            </h2>
            <p className="text-slate-600 leading-relaxed">
              If your refund request is denied and you wish to appeal the decision:
            </p>
            <ol className="list-decimal pl-6 space-y-1.5 text-slate-600 mt-3">
              <li>Submit a written appeal to{" "}
                <a href={`mailto:${identity.companyEmail}`} className="text-emerald-600 hover:underline">{identity.companyEmail}</a>{" "}
                within 14 days of receiving the denial
              </li>
              <li>Include any additional information or documentation supporting your appeal</li>
              <li>Our management team will review the appeal and respond within 10 business days</li>
              <li>The management team&apos;s decision is final and binding</li>
            </ol>
            <p className="text-slate-600 leading-relaxed mt-3">
              For unresolved disputes, you may refer the matter to arbitration in accordance
              with the Dispute Resolution clause in our{" "}
              <span className="text-emerald-600 font-medium cursor-pointer hover:underline">Terms of Service</span>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              9. Changes to This Refund Policy
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this Refund Policy from time to time. Changes will be posted on
              our platform with an updated &quot;Last Updated&quot; date. Material changes will be
              communicated to registered users via email at least 15 days before they take
              effect. The refund policy applicable to your subscription will be the version
              that was in effect at the time of purchase.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              10. Contact Us
            </h2>
            <p className="text-slate-600 leading-relaxed">
              For all billing and refund inquiries, please contact us:
            </p>
            <div className="mt-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-2 text-slate-700">
                <p><strong>{identity.companyName} Portal — Billing Department</strong></p>
                <p>
                  Email:{" "}
                  <a href={`mailto:${identity.companyEmail}`} className="text-emerald-600 hover:underline">{identity.companyEmail}</a>
                </p>
                <p>
                  Support:{" "}
                  <a href={`mailto:${identity.companyEmail}`} className="text-emerald-600 hover:underline">{identity.companyEmail}</a>
                </p>
                <p>Website: {identity.companyWebsite || "brandforge.pk"}</p>
                <p className="text-sm text-slate-500 mt-3">
                  Business Hours: Monday to Friday, 9:00 AM to 6:00 PM Pakistan Standard Time (PKT).
                  We aim to respond to all billing inquiries within 2 business days.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
