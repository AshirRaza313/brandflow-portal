"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { usePlatformIdentity } from "@/lib/platform-identity";

const faqs = [
  {
    question: "What does the Starter plan include?",
    answer:
      "Our Starter plan is Rs. 7,999/month (plus a one-time Rs. 5,000 setup fee) and includes up to 3 team members, 100 orders/month, 50 products, 100 customers, 5 GB storage, 3 marketing channels, 500 emails/month, 3 social accounts, 5 coupons, 20 tasks, 2 integrations, 5 monthly reports, business hours support, and read-only API access. It's perfect for small businesses just getting started. All plans include a 14-day free trial.",
  },
  {
    question: "How many team members can I add?",
    answer:
      "The Starter plan supports up to 3 team members, Growth supports up to 8, Professional supports up to 15, and Enterprise offers unlimited team members, all with role-based access controls and granular permissions.",
  },
  {
    question: "Can I migrate from another platform?",
    answer:
      "Absolutely! Valtriox offers easy import tools for data from popular platforms like Shopify, WooCommerce, and others. Our support team is also available to help with migration to ensure a smooth transition.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Security controls are built into Valtriox, including password hashing, authenticated sessions, role-based access, organization-level data isolation, audit logging, rate limiting, and encrypted HTTPS connections. We continue testing and hardening these controls throughout the beta.",
  },
  {
    question: "Do you offer custom branding?",
    answer:
      "Custom branding is available on our Professional plan (custom logos, colors, branded emails). White-label branding (custom domains, fully branded portal) is available on our Enterprise plan. This makes Valtriox feel like your own platform.",
  },
  {
    question: "What integrations are available?",
    answer:
      "Valtriox integrates with WooCommerce, Shopify, WhatsApp Business API, Google Analytics, Stripe, and more. Enterprise customers also get access to our API for custom integrations.",
  },
];

export function FAQ() {
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  return (
    <section id="faq" className="py-24 bg-[#111827]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            FAQ
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
            Frequently Asked{" "}
            <span className="text-amber-400">Questions</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Got questions? We&apos;ve got answers.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-6 data-[state=open]:shadow-sm data-[state=open]:border-amber-500/20 data-[state=open]:bg-white/[0.05]"
              >
                <AccordionTrigger className="text-left text-base font-medium text-white hover:text-amber-400 py-5 hover:no-underline">
                  {faq.question.replaceAll("Valtriox", companyName)}
                </AccordionTrigger>
                <AccordionContent className="text-slate-400 leading-relaxed pb-5">
                  {faq.answer.replaceAll("Valtriox", companyName)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
