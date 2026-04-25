"use client";

import { Twitter, Linkedin, Instagram } from "lucide-react";
import { usePlatformIdentity } from "@/lib/platform-identity";

interface FooterProps {
  onLegalClick?: (page: string) => void;
}

function splitBrandName(name: string) {
  const mid = Math.ceil(name.length / 2);
  const first = name.slice(0, mid);
  const rest = name.slice(mid);
  return <>{first}<span className="text-amber-400">{rest}</span></>;
}

export function Footer({ onLegalClick }: FooterProps) {
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  const legalSlugMap: Record<string, string> = {
    "Privacy Policy": "privacy",
    "Terms of Service": "terms",
    "Cookie Policy": "cookies",
    "GDPR": "privacy",
    "Refund Policy": "refund",
  };

  const footerLinks = {
    Product: ["Features", "Pricing", "Integrations", "Changelog", "Documentation"],
    Company: ["About", "Blog", "Careers", "Press", "Partners"],
    Resources: ["Help Center", "Community", "Status", "API Docs", "Tutorials"],
    Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Refund Policy"],
  };

  return (
    <footer id="contact" className="bg-slate-950 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/valtriox-logo.png" alt={companyName} className="h-8 w-8 object-contain" />
              <span className="text-xl font-bold text-white">
                {splitBrandName(companyName)}
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Command Your Brand. All-in-one operations portal for modern brands.
            </p>
            <div className="flex gap-3">
              {[Twitter, Linkedin, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-amber-600 flex items-center justify-center transition-colors duration-200"
                >
                  <Icon className="w-4 h-4 text-slate-400 hover:text-white" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-white mb-4">{category}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => {
                  const slug = legalSlugMap[link];
                  const isLegal = !!slug && onLegalClick;

                  return (
                    <li key={link}>
                      {isLegal ? (
                        <button
                          onClick={() => onLegalClick(slug)}
                          className="text-sm text-slate-500 hover:text-amber-400 transition-colors duration-200 cursor-pointer"
                        >
                          {link}
                        </button>
                      ) : (
                        <a
                          href="#"
                          className="text-sm text-slate-500 hover:text-amber-400 transition-colors duration-200"
                        >
                          {link}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            © 2026 {companyName}. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            {onLegalClick ? (
              <>
                <button
                  onClick={() => onLegalClick("privacy")}
                  className="text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Privacy
                </button>
                <button
                  onClick={() => onLegalClick("terms")}
                  className="text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Terms
                </button>
                <a href={`mailto:${identity.companyEmail}`} className="text-slate-500 hover:text-amber-400 transition-colors">
                  Support
                </a>
              </>
            ) : (
              <>
                <a href="#" className="text-slate-500 hover:text-amber-400 transition-colors">Privacy</a>
                <a href="#" className="text-slate-500 hover:text-amber-400 transition-colors">Terms</a>
                <a href="#" className="text-slate-500 hover:text-amber-400 transition-colors">Support</a>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
