// @ts-nocheck — Phase 8: pre-existing TS errors (Decimal/Prisma types, etc.) pending migration
"use client";

import { useState, FormEvent, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Send, Phone, Mail, MapPin, Clock, MessageCircle, CheckCircle2,
  Building2, Globe, Users, ArrowRight, ArrowLeft, Sparkles, Shield, Zap,
  ChevronRight, Instagram, Facebook, Twitter, Linkedin, Youtube,
  Hash, Music, Download, MailCheck, ArrowRightIcon, Home,
  CalendarDays, PartyPopper, Heart, CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePlatformIdentity } from "@/lib/platform-identity";
import { isCalendlyHttpsUrl, isCalendlyMessageOrigin } from "@/lib/calendly";
import { toast } from "sonner";
import Link from "next/link";

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  companySize: string;
  industry: string;
  interest: string;
  message: string;
  consultationType: string;
  calendlyBookingLink?: string;
}

export function ContactPage() {
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  const [form, setForm] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    companySize: "",
    industry: "",
    interest: "",
    message: "",
    consultationType: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [calendlyEnabled, setCalendlyEnabled] = useState(false);
  const [calendlyUrl, setCalendlyUrl] = useState("");

  // Fetch Calendly settings from public API
  useEffect(() => {
    async function fetchCalendlySettings() {
      try {
        const res = await fetch("/api/public/settings");
        if (res.ok) {
          const data = await res.json();
          const settings = data.settings || data;
          if (settings.calendlyEnabled === true || settings.calendlyEnabled === "true") {
            setCalendlyEnabled(true);
            setCalendlyUrl(settings.calendlyUrl || process.env.NEXT_PUBLIC_CALENDLY_URL || "");
          }
        }
      } catch {
        if (process.env.NEXT_PUBLIC_CALENDLY_URL) {
          setCalendlyEnabled(true);
          setCalendlyUrl(process.env.NEXT_PUBLIC_CALENDLY_URL);
        }
      }
    }
    fetchCalendlySettings();
  }, []);

  // Listen for Calendly events
  useEffect(() => {
    if (!calendlyEnabled || !form.consultationType) return;
    function handleCalendlyEvent(e: MessageEvent) {
      if (!isCalendlyMessageOrigin(e.origin)) return;
      if (e.data?.event === "calendly.event_scheduled") {
        const uri = e.data?.payload?.event?.uri;
        const inviteeUri = e.data?.payload?.invitee?.uri;
        if (uri || inviteeUri) {
          setForm((prev) => ({ ...prev, calendlyBookingLink: inviteeUri || uri || "" }));
          toast.success("Consultation time slot booked!");
        }
      }
    }
    window.addEventListener("message", handleCalendlyEvent);
    return () => window.removeEventListener("message", handleCalendlyEvent);
  }, [calendlyEnabled, form.consultationType]);

  const calendlyWidgetVisible = calendlyEnabled && !!form.consultationType;
  const calendlyEmbedUrl = useMemo(() => {
    if (!calendlyWidgetVisible || !isCalendlyHttpsUrl(calendlyUrl)) return "";

    const embedUrl = new URL(calendlyUrl);
    embedUrl.searchParams.set("embed_domain", window.location.host);
    embedUrl.searchParams.set("embed_type", "Inline");
    return embedUrl.toString();
  }, [calendlyWidgetVisible, calendlyUrl]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "contact-page" }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        toast.error(data.error || "Failed to send message. Please try again.");
      }
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const companySizes = ["1-5", "6-20", "21-50", "51-200", "200+"];
  const industries = [
    "E-Commerce", "Fashion & Apparel", "Food & Beverage", "Technology",
    "Services", "Health & Beauty", "Education", "Real Estate", "Other",
  ];
  const interests = [
    "Brand Management", "Order Management", "Inventory & Warehouse",
    "Marketing & Campaigns", "Team Management", "Custom Integration",
    "Enterprise Solution", "Partnership",
  ];
  const consultationTypes = [
    { value: "video_call", label: "Video Call", icon: "Video" },
    { value: "phone_call", label: "Phone Call", icon: "Phone" },
    { value: "in_person", label: "In-Person Meeting", icon: "MapPin" },
  ];


  // Custom SVG icons for Discord, Reddit & TikTok (lucide-react doesn't have these)
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

  // All social links on Contact page - always visible. Clickable only when URL is configured.
  const socialLinks = [
    { icon: Instagram, url: identity.instagramUrl, label: "Instagram" },
    { icon: Facebook, url: identity.facebookUrl, label: "Facebook" },
    { icon: Twitter, url: identity.twitterUrl, label: "X / Twitter" },
    { icon: Linkedin, url: identity.linkedinUrl, label: "LinkedIn" },
    { icon: Youtube, url: identity.youtubeUrl, label: "YouTube" },
    { icon: MessageCircle, url: identity.whatsappNumber ? `https://wa.me/${identity.whatsappNumber.replace(/[^0-9]/g, "")}` : null, label: "WhatsApp" },
    { icon: DiscordIcon, url: identity.discordUrl, label: "Discord" },
    { icon: RedditIcon, url: identity.redditUrl, label: "Reddit" },
    { icon: Music, url: identity.tiktokUrl, label: "TikTok" },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  //  CONVERSION TRACKING - fires once when Thank You page renders
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!submitted) return;

    // Prevent double-fire in strict mode
    let fired = false;

    const track = () => {
      if (fired) return;
      fired = true;

      // 1) Meta Pixel - Lead event
      if (typeof window !== 'undefined' && (window as any).fbq) {
        try {
          (window as any).fbq('track', 'Lead', {
            content_name: 'Contact Form Submission',
            content_category: 'Lead Generation',
          });
          console.log('[Conversion] Meta Pixel Lead event fired');
        } catch (e) {
          console.warn('[Conversion] Meta Pixel error:', e);
        }
      }

      // 2) Google Analytics / gtag - conversion event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        try {
          (window as any).gtag('event', 'generate_lead', {
            event_category: 'engagement',
            event_label: 'contact_form_submission',
            value: 1,
          });
          console.log('[Conversion] GA generate_lead event fired');
        } catch (e) {
          console.warn('[Conversion] GA error:', e);
        }
      }

      // 3) Custom Valtriox conversion event (for future analytics)
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('valtriox:lead_conversion', {
            detail: { email: form.email, name: form.fullName, timestamp: Date.now() },
          }));
          console.log('[Conversion] Custom lead_conversion event dispatched');
        } catch (e) {
          console.warn('[Conversion] Custom event error:', e);
        }
      }
    };

    // Small delay to ensure page is fully visible before tracking
    const timer = setTimeout(track, 800);
    return () => clearTimeout(timer);
  }, [submitted]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE 2: THANK YOU (shown after form submission)
  // ═══════════════════════════════════════════════════════════════════════════
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#161B26] flex flex-col">
        {/* Thank You Hero */}
        <section className="relative pt-24 pb-12 sm:pt-32 sm:pb-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(211,166,56,0.12),transparent_60%)]" />
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              {/* Animated Checkmark */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-8"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
                >
                  <CheckCircle2 className="h-14 w-14 text-amber-400" />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-sm text-amber-300 font-medium">Submission Received</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
                  Thank You,{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
                    {form.fullName.split(" ")[0] || "there"}
                  </span>
                  !
                </h1>
                <p className="text-lg text-slate-400 leading-relaxed max-w-xl mx-auto">
                  Your inquiry has been received successfully. Our team will review it and reach out to you within 24 hours.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Check Your Email + Download Guide */}
        <section className="relative pb-12">
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-amber-500/15"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <MailCheck className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Check Your Email</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    We&apos;ve sent you a detailed email with your inquiry confirmation and a free guide about {companyName} - what it does, how it helps brands like yours, and what to expect from our partnership.
                  </p>
                </div>
              </div>

              {/* Download CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.4 }}
              >
                <a
                  href="/api/lead-magnet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl bg-gradient-to-r from-amber-600/15 to-amber-700/10 border border-amber-500/20 hover:border-amber-500/40 hover:from-amber-600/25 hover:to-amber-700/15 transition-all duration-300 group"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-600/20">
                    <Download className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                      Download Free Guide
                    </p>
                    <p className="text-xs text-slate-500">
                      {companyName} Introduction - PDF Document
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* What Happens Next */}
        <section className="relative pb-16">
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.5 }}
            >
              <h3 className="text-lg font-bold text-white mb-6 text-center">What Happens Next</h3>
              <div className="grid gap-4">
                {[
                  {
                    step: 1,
                    title: "Email Sent with Free Guide",
                    description: `A confirmation email with your free ${companyName} guide has been sent to your inbox.`,
                  },
                  {
                    step: 2,
                    title: "Our Team Reviews Your Inquiry",
                    description: "Our team will carefully review your inquiry and prepare a personalized response.",
                  },
                  {
                    step: 3,
                    title: "Free Consultation Call Scheduled",
                    description: `We'll reach out to schedule a free consultation call to discuss how ${companyName} can help your brand grow.`,
                  },
                ].map((item) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 + item.step * 0.15, duration: 0.4 }}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
                      <span className="text-sm font-bold text-amber-400">{item.step}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white mb-0.5">{item.title}</p>
                      <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Contact Us - Get in touch directly */}
        <section className="relative pb-16">
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.5 }}
            >
              <h3 className="text-lg font-bold text-white mb-2 text-center">Get In Touch</h3>
              <p className="text-sm text-slate-500 mb-6 text-center">Reach out to us directly - we&apos;d love to hear from you</p>

              {/* Contact Info Cards */}
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <a
                  href={`mailto:${identity.companyEmail || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "ashir@valtriox.com"}`}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-amber-500/15 hover:border-amber-500/30 transition-all duration-300 group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <Mail className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Email Us</p>
                    <p className="text-sm font-medium text-white">{identity.companyEmail || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "ashir@valtriox.com"}</p>
                  </div>
                </a>

                <a
                  href={`tel:${identity.companyPhone || "+923183916019"}`}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-amber-500/15 hover:border-amber-500/30 transition-all duration-300 group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <Phone className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Call Us</p>
                    <p className="text-sm font-medium text-white">{identity.companyPhone || "+92-318 3916019"}</p>
                  </div>
                </a>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-amber-500/15">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Visit Us</p>
                    <p className="text-sm font-medium text-white">{identity.companyAddress || "Karachi, Pakistan"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-amber-500/15">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Support Hours</p>
                    <p className="text-sm font-medium text-white">{identity.supportHours || "Mon-Fri: 9AM-6PM PKT"}</p>
                  </div>
                </div>
              </div>

              {/* WhatsApp CTA */}
              {identity.whatsappNumber && (
                <a
                  href={`https://wa.me/${identity.whatsappNumber.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all duration-300 mb-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Chat on WhatsApp</p>
                    <p className="text-xs text-slate-400">Message our team during business hours</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-green-400" />
                </a>
              )}

              {/* Social Media Icons */}
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium text-center mb-3">Connect With Us</p>
              <div className="flex flex-wrap justify-center gap-2">
                {socialLinks.map((link, i) => {
                  const hasUrl = !!link.url;
                  const Wrapper = hasUrl ? 'a' : 'span';
                  return (
                    <Wrapper
                      key={i}
                      {...(hasUrl ? { href: link.url!, target: "_blank", rel: "noopener noreferrer" } : {})}
                      title={hasUrl ? link.label : `${link.label} (coming soon)`}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group ${
                        hasUrl
                          ? "bg-white/[0.03] border border-amber-500/15 hover:border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                          : "bg-white/[0.02] border border-white/[0.04] opacity-35 cursor-default"
                      }`}
                    >
                      <link.icon className={`w-4 h-4 transition-colors ${
                        hasUrl ? "text-slate-400 group-hover:text-amber-400" : "text-slate-600"
                      }`} />
                    </Wrapper>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Explore Features + Back to Home */}
        <section className="relative pb-16">
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 0.5 }}
              className="text-center"
            >
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors duration-200 group mb-6"
              >
                <Sparkles className="h-4 w-4" />
                Explore Features
                <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <div>
                <Button
                  asChild
                  className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-700 hover:via-yellow-600 hover:to-amber-700 text-black font-semibold rounded-xl shadow-lg shadow-amber-600/20 text-base gap-2 transition-all duration-300"
                >
                  <Link href="/">
                    <Home className="h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] py-8 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-slate-500">
                &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
              </p>
              {/* Social Icons in Footer */}
              <div className="flex flex-wrap justify-center gap-2">
                {socialLinks.map((link, i) => {
                  const hasUrl = !!link.url;
                  const Wrapper = hasUrl ? 'a' : 'span';
                  return (
                    <Wrapper
                      key={i}
                      {...(hasUrl ? { href: link.url!, target: "_blank", rel: "noopener noreferrer" } : {})}
                      title={hasUrl ? link.label : `${link.label} (coming soon)`}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 group ${
                        hasUrl
                          ? "bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                          : "bg-white/[0.02] border border-white/[0.04] opacity-35 cursor-default"
                      }`}
                    >
                      <link.icon className={`w-3.5 h-3.5 transition-colors ${
                        hasUrl ? "text-slate-500 group-hover:text-amber-400" : "text-slate-600"
                      }`} />
                    </Wrapper>
                  );
                })}
              </div>
              <div className="flex gap-6 text-sm">
                <Link href="/privacy" className="text-slate-500 hover:text-amber-400 transition-colors">Privacy</Link>
                <Link href="/terms" className="text-slate-500 hover:text-amber-400 transition-colors">Terms</Link>
                <a href={`mailto:${identity.companyEmail || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "ashir@valtriox.com"}`} className="text-slate-500 hover:text-amber-400 transition-colors">Support</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE 1: LEAD FORM (default view)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#161B26]">
      {/* Hero Header */}
      <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(211,166,56,0.08),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-sm text-amber-300 font-medium">Contact Us</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Get In{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
                Touch
              </span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
              Ready to transform your brand operations? Our team is here to help you get started.
              Book a free consultation or drop us a message.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Back to Home Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-amber-400 transition-colors duration-200 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>
      </div>

      {/* Main Content */}
      <section className="relative pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/[0.03] rounded-full blur-[120px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Left Side - Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-2 space-y-6 order-2 lg:order-1"
            >
              {/* Contact Cards */}
              {[
                { icon: Mail, label: "Email Us", value: identity.companyEmail || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "ashir@valtriox.com", href: `mailto:${identity.companyEmail || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "ashir@valtriox.com"}` },
                { icon: Phone, label: "Call Us", value: identity.companyPhone || "+92-318 3916019", href: `tel:${identity.companyPhone || "+923183916019"}` },
                { icon: MapPin, label: "Visit Us", value: identity.companyAddress || "Karachi, Pakistan", href: "https://www.google.com/maps/search/?api=1&query=Karachi%2C+Pakistan" },
                { icon: Clock, label: "Support Hours", value: identity.supportHours || "Mon-Fri: 9AM-6PM PKT", href: "#" },
              ].map((item, i) => (
                <a
                  key={i}
                  href={item.href}
                  className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/20 transition-all duration-300 group"
                >
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <item.icon className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{item.label}</p>
                    <p className="text-sm font-medium text-white">{item.value}</p>
                  </div>
                </a>
              ))}

              {/* WhatsApp CTA */}
              {identity.whatsappNumber && (
                <a
                  href={`https://wa.me/${identity.whatsappNumber.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all duration-300"
                >
                  <div className="w-11 h-11 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Chat on WhatsApp</p>
                    <p className="text-xs text-slate-400">Message our team during business hours</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-green-400" />
                </a>
              )}

              {/* Trust Signals */}
              <div className="pt-4 space-y-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Why Choose Us</p>
                {[
                  { icon: Shield, text: "Role-based access & encrypted connections" },
                  { icon: Zap, text: "Guided beta onboarding" },
                  { icon: Users, text: "Personal onboarding for beta participants" },
                  { icon: Globe, text: "Built in Pakistan, for Pakistani brands" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-slate-400">{item.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right Side - Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-3 order-1 lg:order-2"
            >
              <form
                onSubmit={handleSubmit}
                className="p-6 sm:p-8 lg:p-10 rounded-3xl bg-white/[0.03] border border-white/[0.06] space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                    <Send className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Request a Consultation</h3>
                    <p className="text-xs text-slate-500">Free 30-minute strategy session</p>
                  </div>
                </div>

                {/* Row 1: Name & Email */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        id="contact-page-fullname"
                        name="fullName"
                        required
                        autoComplete="name"
                        placeholder="John Doe"
                        value={form.fullName}
                        onChange={(e) => handleChange("fullName", e.target.value)}
                        className="pl-10 border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 rounded-xl h-11 focus:border-amber-500/50 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">
                      Work Email <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        id="contact-page-email"
                        name="email"
                        required
                        type="email"
                        autoComplete="email"
                        placeholder="john@company.com"
                        value={form.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className="pl-10 border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 rounded-xl h-11 focus:border-amber-500/50 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Phone & Company */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        id="contact-page-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+92-318 3916019"
                        value={form.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        className="pl-10 border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 rounded-xl h-11 focus:border-amber-500/50 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Company Name</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        id="contact-page-company"
                        name="company"
                        autoComplete="organization"
                        placeholder="Your Brand Inc."
                        value={form.company}
                        onChange={(e) => handleChange("company", e.target.value)}
                        className="pl-10 border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 rounded-xl h-11 focus:border-amber-500/50 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Company Size & Industry */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Team Size</label>
                    <select
                      id="contact-page-team-size"
                      name="companySize"
                      autoComplete="off"
                      value={form.companySize}
                      onChange={(e) => handleChange("companySize", e.target.value)}
                      className="w-full h-11 rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 text-sm px-3 focus:outline-none focus:border-amber-500/50 focus:ring-amber-500/20 appearance-none cursor-pointer"
                    >
                      <option value="">Select team size</option>
                      {companySizes.map((size) => (
                        <option key={size} value={size} className="bg-slate-900">{size} people</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Industry</label>
                    <select
                      id="contact-page-industry"
                      name="industry"
                      autoComplete="organization-title"
                      value={form.industry}
                      onChange={(e) => handleChange("industry", e.target.value)}
                      className="w-full h-11 rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 text-sm px-3 focus:outline-none focus:border-amber-500/50 focus:ring-amber-500/20 appearance-none cursor-pointer"
                    >
                      <option value="">Select industry</option>
                      {industries.map((ind) => (
                        <option key={ind} value={ind} className="bg-slate-900">{ind}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 4: Interest Area */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">What are you most interested in?</label>
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest) => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => handleChange("interest", form.interest === interest ? "" : interest)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                          form.interest === interest
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-white/[0.03] text-slate-500 border border-white/[0.06] hover:border-white/[0.12] hover:text-slate-400"
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 5: Consultation Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Preferred Consultation Method <span className="text-amber-400">(Recommended)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {consultationTypes.map((ct) => (
                      <button
                        key={ct.value}
                        type="button"
                        onClick={() => handleChange("consultationType", form.consultationType === ct.value ? "" : ct.value)}
                        className={`p-3 rounded-xl text-center transition-all duration-200 ${
                          form.consultationType === ct.value
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/5"
                            : "bg-white/[0.03] text-slate-500 border border-white/[0.06] hover:border-white/[0.12] hover:text-slate-400"
                        }`}
                      >
                        <div className={`text-lg mb-1 ${form.consultationType === ct.value ? "text-amber-400" : "text-slate-600"}`}>
                          {ct.icon === "Video" && <svg className="w-5 h-5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>}
                          {ct.icon === "Phone" && <Phone className="w-5 h-5 mx-auto" />}
                          {ct.icon === "MapPin" && <MapPin className="w-5 h-5 mx-auto" />}
                        </div>
                        <span className="text-xs font-medium">{ct.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 6: Calendly Widget (replaces manual date/time/availability) */}
                {calendlyWidgetVisible && calendlyEmbedUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-amber-400" />
                      <label className="text-xs font-medium text-slate-400">
                        Pick Your Consultation Time <span className="text-amber-400">(Recommended)</span>
                      </label>
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-amber-500/20 bg-[#1a1a2e]">
                      <iframe
                        src={calendlyEmbedUrl}
                        title="Schedule a Valtriox consultation"
                        className="calendly-inline-widget w-full border-0"
                        style={{ minWidth: "320px", height: "630px" }}
                      />
                    </div>
                    {form.calendlyBookingLink && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        <p className="text-xs text-emerald-400 font-medium">
                          Meeting time slot booked successfully!
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Row 8: Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Tell us about your needs</label>
                  <Textarea
                    placeholder="Describe your brand, current challenges, and what you're looking for..."
                    rows={3}
                    value={form.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    className="border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 rounded-xl resize-none focus:border-amber-500/50 focus:ring-amber-500/20"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-700 hover:via-yellow-600 hover:to-amber-700 text-black font-semibold rounded-xl shadow-lg shadow-amber-600/20 text-base gap-2 transition-all duration-300"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Bottom note */}
                <p className="text-[11px] text-slate-600 text-center">
                  By submitting this form, you agree to our{" "}
                  <Link href="/privacy" className="text-slate-500 underline hover:text-amber-400 transition-colors">
                    Privacy Policy
                  </Link>
                  . We&apos;ll respond within 24 hours.
                </p>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Links Section - always visible */}
      <section className="relative py-16 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-lg font-bold text-white mb-2">Follow Us</h3>
          <p className="text-sm text-slate-500 mb-8">Stay connected on our social media channels</p>
          <div className="flex flex-wrap justify-center gap-3">
            {socialLinks.map((link, i) => {
              const hasUrl = !!link.url;
              const Wrapper = hasUrl ? 'a' : 'span';
              return (
                <Wrapper
                  key={i}
                  {...(hasUrl ? { href: link.url!, target: "_blank", rel: "noopener noreferrer" } : {})}
                  title={hasUrl ? link.label : `${link.label} (coming soon)`}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group ${
                    hasUrl
                      ? "bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                      : "bg-white/[0.02] border border-white/[0.04] opacity-35 cursor-default"
                  }`}
                >
                  <link.icon className={`w-5 h-5 transition-colors ${
                    hasUrl ? "text-slate-400 group-hover:text-amber-400" : "text-slate-600"
                  }`} />
                </Wrapper>
              );
            })}
          </div>
        </div>
      </section>

      {/* Founder Section — Made by Muhammad Ashir Raza */}
      <section className="relative py-16 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Meet the Founder</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Built by Muhammad Ashir Raza
          </h2>
          <p className="text-base text-slate-400 leading-relaxed mb-6 max-w-2xl mx-auto">
            Valtriox was founded and engineered by <span className="text-amber-300 font-medium">Muhammad Ashir Raza</span> with a single
            mission: to give modern brands one universal portal to command every aspect of their business.
            From order management to customer insights, every line of code reflects a commitment to power, simplicity, and elegance.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://www.linkedin.com/in/muhammad-ashir-raza"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-medium hover:from-amber-600 hover:to-amber-700 transition-all shadow-[0_0_20px_rgba(211,166,56,0.25)]"
            >
              <Linkedin className="h-4 w-4" />
              Connect on LinkedIn
            </a>
            <a
              href={`mailto:${identity.companyEmail || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "ashir@valtriox.com"}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/5 hover:text-white transition-all"
            >
              <Mail className="h-4 w-4" />
              Email the Founder
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/privacy" className="text-slate-500 hover:text-amber-400 transition-colors">Privacy</Link>
              <Link href="/terms" className="text-slate-500 hover:text-amber-400 transition-colors">Terms</Link>
              <a href={`mailto:${identity.companyEmail}`} className="text-slate-500 hover:text-amber-400 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
