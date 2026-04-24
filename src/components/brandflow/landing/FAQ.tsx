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
    question: "Is BrandFlow really free?",
    answer:
      "Yes! Our Starter plan is completely free forever with no credit card required. You get up to 3 team members, 100 orders per month, basic analytics, and 5 AI queries per day. It's perfect for small businesses just getting started.",
  },
  {
    question: "How many team members can I add?",
    answer:
      "The Starter plan supports up to 3 team members. The Growth plan supports up to 15 team members, and the Enterprise plan offers unlimited team members with role-based access controls and granular permissions.",
  },
  {
    question: "Can I migrate from another platform?",
    answer:
      "Absolutely! BrandFlow offers easy import tools for data from popular platforms like Shopify, WooCommerce, and others. Our support team is also available to help with migration to ensure a smooth transition.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Enterprise-grade security is at the core of BrandFlow. We use AES-256 encryption for data at rest, TLS 1.3 for data in transit, and our infrastructure is hosted on secure cloud providers with SOC 2 Type II compliance.",
  },
  {
    question: "Do you offer custom branding?",
    answer:
      "White-label branding is available on our Enterprise plan. This includes custom logos, colors, domains, and branded email templates to make BrandFlow feel like your own platform.",
  },
  {
    question: "What integrations are available?",
    answer:
      "BrandFlow integrates with WooCommerce, Shopify, WhatsApp Business API, Google Analytics, Stripe, and more. Enterprise customers also get access to our API for custom integrations.",
  },
];

export function FAQ() {
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  return (
    <section className="py-24 bg-[#060610]">
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
                  {faq.question.replaceAll("BrandFlow", companyName)}
                </AccordionTrigger>
                <AccordionContent className="text-slate-400 leading-relaxed pb-5">
                  {faq.answer.replaceAll("BrandFlow", companyName)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
