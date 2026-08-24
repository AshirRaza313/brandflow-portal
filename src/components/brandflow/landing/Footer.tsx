"use client";

import Image from "next/image";
import { Linkedin, Instagram } from "lucide-react";
import { usePlatformIdentity } from "@/lib/platform-identity";

interface FooterProps {
  onLegalClick?: (page: string) => void;
}

/* Custom SVG icons for Discord & Reddit (lucide-react doesn't have these) */
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 000-.462.341.341 0 00-.461 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.206-.095z"/>
    </svg>
  );
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

  // Dedicated routes for legal pages (used when onLegalClick is not provided)
  const legalRouteMap: Record<string, string> = {
    "Privacy Policy": "/privacy",
    "Terms of Service": "/terms",
    "Cookie Policy": "/cookies",
    "Refund Policy": "/refund",
  };

  // Map non-legal footer links to real routes / section anchors.
  // SEO NOTE (Rank Math fix): Previously many links pointed to "/" or "/contact",
  // collapsing into only 4 unique internal URLs. Rank Math flagged
  // "Too few internal links (4)". We now spread links across all real
  // indexable routes and section anchors that exist on the site:
  //   /about, /contact, /privacy, /terms, /cookies, /refund,
  //   /#features, /#pricing, /#about, /#how-it-works, /#early-access, /#faq
  // This gives 12+ unique internal URLs for crawlers to discover.
  const linkRouteMap: Record<string, string> = {
    // Product → section anchors + dedicated routes
    "Features": "/#features",
    "Pricing": "/#pricing",
    // Company → /about and /contact
    "About": "/about",
    "Contact": "/contact",
    // Resources → section anchors + /contact + /about
    "Help Center": "/#faq",
    "Early Access": "/#early-access",
  };

  const socialLinks = identity.socialLinksVisible ? [
    { icon: Instagram, url: identity.instagramUrl, label: "Instagram", visible: identity.showInstagram },
    { icon: Linkedin, url: identity.linkedinUrl, label: "LinkedIn", visible: identity.showLinkedin },
    { icon: DiscordIcon, url: identity.discordUrl, label: "Discord", visible: identity.showDiscord },
    { icon: RedditIcon, url: identity.redditUrl, label: "Reddit", visible: identity.showReddit },
  ].filter((link) => link.visible && Boolean(link.url)) : [];

  const footerLinks = {
    Product: ["Features", "Pricing"],
    Company: ["About", "Contact"],
    Resources: ["Help Center", "Early Access"],
    Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Refund Policy"],
  };

  return (
    <footer className="bg-slate-950 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/valtriox-logo.png"
                alt={`${companyName} logo`}
                width={140}
                height={32}
                className="h-8 w-auto object-contain"
                priority={false}
              />
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              COMMAND YOUR BRAND UNIVERSE. Invite-only beta for selected brand-operation workflows.
            </p>
            <div className="flex gap-2.5">
              {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.label}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 bg-slate-800 hover:bg-amber-600 group"
                  >
                    <link.icon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
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
                  const isLegal = !!slug;
                  const legalRoute = legalRouteMap[link];

                  // Determine the href: legal modal button, legal dedicated route, or regular link route
                  const regularHref = linkRouteMap[link] || "/";

                  return (
                    <li key={link}>
                      {/*
                        SEO: Legal links ALWAYS render as real <a href> tags
                        pointing to dedicated /privacy, /terms, /cookies,
                        /refund routes. This ensures crawlers count them as
                        internal links. When onLegalClick is provided (homepage
                        UX), we intercept the click with preventDefault and
                        show the modal instead — users get the modal, crawlers
                        get the real href.
                      */}
                      {isLegal && legalRoute ? (
                        <a
                          href={legalRoute}
                          onClick={(e) => {
                            if (onLegalClick && slug) {
                              e.preventDefault();
                              onLegalClick(slug);
                            }
                          }}
                          className="text-sm text-slate-500 hover:text-amber-400 transition-colors duration-200 cursor-pointer"
                        >
                          {link}
                        </a>
                      ) : (
                        <a
                          href={regularHref}
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
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
            <p className="text-sm text-slate-500">
              &copy; 2026 {companyName}. All rights reserved.
            </p>
            <p className="text-xs text-slate-600">
              Made with <span className="text-amber-500/80">&#9829;</span> by{" "}
              <a
                href="https://www.linkedin.com/in/muhammad-ashir-raza"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-400 hover:text-amber-400 transition-colors duration-200"
                title="Muhammad Ashir Raza, Founder and Developer of Valtriox"
              >
                Muhammad Ashir Raza
              </a>
            </p>
          </div>
          <div className="flex gap-6 text-sm">
            {/*
              SEO: Bottom legal links always render as real <a href> tags.
              When onLegalClick is provided (homepage), we intercept the click
              to show the modal — but the href is still /privacy, /terms, etc.
              so crawlers count them as internal links.
            */}
            <a
              href="/privacy"
              onClick={(e) => {
                if (onLegalClick) { e.preventDefault(); onLegalClick("privacy"); }
              }}
              className="text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
            >
              Privacy
            </a>
            <a
              href="/terms"
              onClick={(e) => {
                if (onLegalClick) { e.preventDefault(); onLegalClick("terms"); }
              }}
              className="text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
            >
              Terms
            </a>
            <a href="/contact" className="text-slate-500 hover:text-amber-400 transition-colors">
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
