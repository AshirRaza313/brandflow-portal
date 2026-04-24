"use client";

import { motion } from "framer-motion";

const companies = [
  "TechVenture", "StyleHaus", "FoodCraft", "GreenLeaf", "NovaBrand",
  "UrbanEdge", "PureJoy", "SwiftShip", "Artisan Co", "BrightPath",
  "Zenith Labs", "Peak Goods",
];

export function SocialProof() {
  return (
    <section className="py-16 bg-[#0a0a0f] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm font-medium text-slate-500 uppercase tracking-wider mb-10"
        >
          Powering businesses across 50+ countries
        </motion.p>
      </div>

      {/* Scrolling logos */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0a0a0f] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0a0a0f] to-transparent z-10" />
        <div className="flex animate-scroll-left">
          {[...companies, ...companies].map((company, i) => (
            <div
              key={`${company}-${i}`}
              className="flex-shrink-0 mx-8 px-6 py-3 bg-white/[0.03] rounded-lg border border-white/[0.06]"
            >
              <span className="text-lg font-bold text-slate-500 whitespace-nowrap">
                {company}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
