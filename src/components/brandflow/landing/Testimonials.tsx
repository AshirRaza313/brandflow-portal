"use client";

import { motion } from "framer-motion";
import { BarChart3, MessageSquare, Settings } from "lucide-react";
import { usePlatformIdentity } from "@/lib/platform-identity";

const betaExperience = [
  {
    icon: Settings,
    title: "Personal onboarding",
    description:
      "We learn your current workflow and help you configure the beta around the modules you actually need.",
  },
  {
    icon: MessageSquare,
    title: "Direct product feedback",
    description:
      "Share friction, missing workflows, and priorities directly with the team shaping each release.",
  },
  {
    icon: BarChart3,
    title: "Measure your own outcomes",
    description:
      "Set a baseline, evaluate the workflow with your own data, and decide whether the platform creates real value for you.",
  },
];

export function Testimonials() {
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  return (
    <section id="early-access" className="py-24 bg-[#161B26]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            Early Access
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
            Help Shape {companyName}{" "}
            <span className="text-amber-400">During Beta</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Verified customer stories will be published only with permission and supporting evidence.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {betaExperience.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="h-full rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 p-6">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                  <item.icon className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
