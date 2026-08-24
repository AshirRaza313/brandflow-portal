"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformIdentity } from "@/lib/platform-identity";
import { Instagram, Linkedin } from "lucide-react";

interface NavbarProps {
  onAuthClick: (mode: "login" | "signup") => void;
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

export function Navbar({ onAuthClick }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "Early Access", href: "#early-access" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  const scrollTo = useCallback((href: string) => {
    // If it's a full path (like /contact), navigate instead of scroll
    if (href.startsWith('/')) {
      setMobileOpen(false);
      window.location.href = href;
      return;
    }
    // Close menu first, then scroll after animation completes
    setMobileOpen(false);
    setTimeout(() => {
      const el = document.querySelector(href);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 350);
  }, []);

  // Public social links require both a configured URL and the matching
  // visibility flag. Unreviewed admin values never appear by URL alone.
  const socialLinks = identity.socialLinksVisible ? [
    { icon: Instagram, url: identity.instagramUrl, label: "Instagram", visible: identity.showInstagram },
    { icon: Linkedin, url: identity.linkedinUrl, label: "LinkedIn", visible: identity.showLinkedin },
    { icon: DiscordIcon, url: identity.discordUrl, label: "Discord", visible: identity.showDiscord },
    { icon: RedditIcon, url: identity.redditUrl, label: "Reddit", visible: identity.showReddit },
  ].filter((link) => link.visible && Boolean(link.url)) : [];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-[#161B26]/80 backdrop-blur-xl border-b border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center min-w-0 shrink">
            <Image
              src="/valtriox-logo.png"
              alt={`${companyName} logo`}
              width={140}
              height={36}
              className="h-7 sm:h-9 w-auto object-contain"
              priority
            />
          </div>

          {/* Spacer - pushes hamburger to right on mobile; on desktop, nav links handle centering via flex-1 */}
          <div className="flex-1 min-w-[8px] lg:hidden" />

          {/* Desktop Nav - centered between logo and right-side buttons */}
          <div className="hidden lg:flex flex-1 items-center justify-center gap-8">
            {/*
              SEO: Nav links render as real <a href> tags so crawlers can
              discover internal routes. For section anchors (#features etc.)
              we intercept the click with preventDefault and smooth-scroll;
              for real routes (/about, /contact) we let the browser navigate.
            */}
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  if (link.href.startsWith("#")) {
                    e.preventDefault();
                    scrollTo(link.href);
                  }
                }}
                className="text-sm font-medium text-slate-400 hover:text-amber-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop Right Side */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Explicitly enabled social profiles */}
            <div className="flex items-center gap-1.5 mr-2">
            {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 text-slate-500 hover:text-amber-400 hover:bg-white/[0.05]"
                >
                  <link.icon className="h-3.5 w-3.5" />
                </a>
            ))}
          </div>
            <Button
              variant="outline"
              onClick={() => onAuthClick("login")}
              className="border-white/[0.1] text-slate-300 hover:bg-white/[0.05] hover:text-white rounded-xl"
            >
              Login
            </Button>
            {/* SEO: <a href="/contact"> for crawler discovery */}
            <a
              href="/contact"
              className="inline-flex items-center justify-center bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl shadow-[0_0_16px_rgba(211,166,56,0.25)] h-9 px-4 text-sm font-medium transition-colors"
            >
              Get Started
            </a>
          </div>

          {/* Mobile Hamburger - always inside viewport */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/[0.05] active:bg-white/[0.1] transition-colors text-slate-300"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#161B26] border-t border-white/[0.06] overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => {
                    if (link.href.startsWith("#")) {
                      e.preventDefault();
                      scrollTo(link.href);
                      setMobileOpen(false);
                    }
                  }}
                  className="block w-full text-left px-4 py-3 text-sm font-medium text-slate-300 hover:text-amber-400 active:text-amber-300 hover:bg-amber-500/10 active:bg-amber-500/20 rounded-xl transition-colors min-h-[44px]"
                >
                  {link.label}
                </a>
              ))}

              {/* Mobile social links */}
              <div className="flex flex-wrap items-center gap-2 pt-3">
                {socialLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={link.label}
                      className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors bg-slate-800/80 text-slate-400 hover:text-amber-400 active:text-amber-300 active:bg-slate-700"
                    >
                      <link.icon className="h-4.5 w-4.5" />
                    </a>
                ))}
              </div>

              <div className="pt-4 border-t border-white/[0.06] space-y-2">
                <Button
                  variant="outline"
                  className="w-full border-white/[0.1] text-slate-300 hover:text-white rounded-xl h-12 text-sm"
                  onClick={() => { onAuthClick("login"); setMobileOpen(false); }}
                >
                  Login
                </Button>
                <Button
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl h-12 text-sm shadow-[0_0_16px_rgba(211,166,56,0.25)]"
                  onClick={() => { window.location.href = '/contact'; }}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
