"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { usePlatformIdentity } from "@/lib/platform-identity";

const testimonials = [
  {
    name: "Sarah Chen",
    company: "StyleHaus Boutique",
    role: "Founder & CEO",
    quote:
      "Valtriox completely transformed how we manage our online store. Orders, inventory, and team tasks — all in one place. We saved 15 hours per week on operations.",
    avatar: "SC",
    rating: 5,
  },
  {
    name: "Marcus Rodriguez",
    company: "FoodCraft Delights",
    role: "Operations Manager",
    quote:
      "The AI insights are game-changing. It predicted our seasonal demand and helped us stock up just right. Our food waste dropped by 40% in the first month.",
    avatar: "MR",
    rating: 5,
  },
  {
    name: "Aisha Patel",
    company: "TechVenture Store",
    role: "Head of E-Commerce",
    quote:
      "We switched from 4 different tools to Valtriox. The team collaboration features alone justified the switch. Best investment we made this year.",
    avatar: "AP",
    rating: 5,
  },
];

export function Testimonials() {
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  return (
    <section className="py-24 bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            Testimonials
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
            Loved by Brands{" "}
            <span className="text-amber-400">Worldwide</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            See what business owners are saying about {companyName}.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="h-full rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 p-6">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-slate-300 leading-relaxed mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-sm font-bold border border-amber-500/20">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
