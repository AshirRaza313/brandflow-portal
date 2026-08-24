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
      "The published Starter configuration is Rs. 7,999/month plus a one-time Rs. 4,999 setup fee. It includes the limits shown in the pricing table, such as up to 3 team members, 100 orders per month, and 50 products. Beta availability and final terms are confirmed during onboarding; the current published trial period is 14 days.",
  },
  {
    question: "How many team members can I add?",
    answer:
      "The current published limits are up to 3 team members on Starter, 8 on Growth, and 15 on Professional. Enterprise capacity and any custom limits are confirmed in a written proposal. Role-based access is available within the workspace.",
  },
  {
    question: "Can I migrate from another platform?",
    answer:
      "Valtriox includes import and export workflows for supported file formats. Direct migration from a specific third-party platform is not assumed; we review the source, format, and beta scope before confirming migration assistance.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Security controls are built into Valtriox, including password hashing, authenticated sessions, role-based access, organization-level data isolation, audit logging, rate limiting, and encrypted HTTPS connections. We continue testing and hardening these controls throughout the beta.",
  },
  {
    question: "Do you offer custom branding?",
    answer:
      "Branding controls are available in parts of the product. The exact logo, color, email, domain, and white-label options depend on the selected plan and beta configuration, so they are confirmed during onboarding.",
  },
  {
    question: "What integrations are available?",
    answer:
      "The beta contains connector settings and workflows for selected services, but a listed connector is not a promise that a live third-party connection is enabled. We confirm supported connections, credentials, API access, and any custom work for each onboarding.",
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
