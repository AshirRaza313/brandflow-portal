"use client";

import { motion } from "framer-motion";

const betaCommitments = [
  "Invite-only beta",
  "Founder-led onboarding",
  "Pakistan-first rollout",
  "Feedback-driven roadmap",
];

export function SocialProof() {
  return (
    <section className="py-16 bg-[#161B26]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm font-medium text-slate-500 uppercase tracking-wider mb-3"
        >
          Built in Pakistan for early adopters
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-lg text-slate-300 mb-8"
        >
          Transparent about where we are, focused on what we build next.
        </motion.p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {betaCommitments.map((commitment, index) => (
            <motion.div
              key={commitment}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-center text-sm font-medium text-slate-300"
            >
              {commitment}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
