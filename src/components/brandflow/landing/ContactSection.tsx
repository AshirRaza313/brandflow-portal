"use client";

import { useState, FormEvent, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Phone, Mail, Clock, MessageCircle, CheckCircle2,
  Building2, Globe, Users, ArrowRight, Sparkles, Shield, Zap,
  ChevronRight,
  CalendarCheck, PartyPopper, Heart, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePlatformIdentity } from "@/lib/platform-identity";
import { isCalendlyHttpsUrl, isCalendlyMessageOrigin } from "@/lib/calendly";
import { toast } from "sonner";

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

interface ContactSectionProps {
  onLegalClick?: (page: string) => void;
}

export function ContactSection({ onLegalClick }: ContactSectionProps) {
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
  const [submissionConfirmation, setSubmissionConfirmation] = useState("");
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
        // Fallback: check env var
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
          toast.success("Calendly reported the consultation time slot as booked.");
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
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success === true && data.confirmed === true) {
        setSubmissionConfirmation(data.message || "A stored inquiry was confirmed for beta review. Follow-up timing varies.");
        setSubmitted(true);
      } else {
        toast.error(data.error || "We could not confirm that your inquiry was stored. Please try again.");
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

  const resetForm = () => {
    setSubmitted(false);
    setSubmissionConfirmation("");
    setForm({
      fullName: "", email: "", phone: "", company: "", companySize: "",
      industry: "", interest: "", message: "", consultationType: "",
    });
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
  ];

  return (
    <section id="contact" className="relative bg-[#161B26] py-24 sm:py-32">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(211,166,56,0.06),transparent_60%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/[0.03] rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-sm text-amber-300 font-medium">Get In Touch</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Discuss Your Beta{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
              Workflow
            </span>
          </h2>
          <p className="mt-5 text-lg text-slate-400 leading-relaxed">
            Share the workflow you want to test. We review beta requests during published business hours and confirm any walkthrough separately.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Left Side - Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Contact Cards */}
            {[
              { icon: Mail, label: "Email Us", value: identity.companyEmail || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "ashir@valtriox.com", href: `mailto:${identity.companyEmail || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "ashir@valtriox.com"}` },
              { icon: Phone, label: "Call Us", value: identity.companyPhone || "+92-318 3916019", href: `tel:${identity.companyPhone || "+923183916019"}` },
              { icon: Clock, label: "Support Hours", value: identity.supportHours, href: null },
            ].map((item, i) => {
              const content = (
                <>
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <item.icon className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{item.label}</p>
                    <p className="text-sm font-medium text-white">{item.value}</p>
                  </div>
                </>
              );
              const className = "flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] transition-all duration-300 group";

              return item.href ? (
                <a key={i} href={item.href} className={`${className} hover:border-amber-500/20`}>
                  {content}
                </a>
              ) : (
                <div key={i} className={className}>
                  {content}
                </div>
              );
            })}

            {/* WhatsApp CTA */}
            {identity.socialLinksVisible && identity.showWhatsApp && identity.whatsappNumber && (
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
                { icon: Users, text: "Invite-only beta access" },
                { icon: Globe, text: "Pakistan is the current starting market" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-slate-400">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Side - Form / Thank You Page */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <AnimatePresence mode="wait">
              {submitted ? (
                /* ═══════════ PAGE 2: THANK YOU ═══════════ */
                <motion.div
                  key="thank-you"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="p-6 sm:p-8 lg:p-10 rounded-3xl bg-white/[0.03] border border-amber-500/20"
                >
                  {/* Success Animation */}
                  <div className="text-center mb-8">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", duration: 0.8, delay: 0.2 }}
                      className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-6"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.6, delay: 0.5 }}
                      >
                        <CheckCircle2 className="h-12 w-12 text-amber-400" />
                      </motion.div>
                      {/* Confetti particles */}
                      <motion.div
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ opacity: [0, 1, 0], y: [-5, -25, -45] }}
                        transition={{ duration: 1.5, delay: 0.8 }}
                        className="absolute -top-2 -right-2"
                      >
                        <PartyPopper className="h-5 w-5 text-amber-300" />
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, delay: 1 }}
                        className="absolute -bottom-1 -left-1"
                      >
                        <Sparkles className="h-4 w-4 text-yellow-400" />
                      </motion.div>
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="text-2xl sm:text-3xl font-bold text-white mb-3"
                    >
                      Thank You for Your Interest in{" "}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
                        {companyName}
                      </span>
                      !
                    </motion.h3>

                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto"
                    >
                      {submissionConfirmation || "A stored inquiry was confirmed for beta review. Follow-up timing varies."}
                    </motion.p>
                  </div>

                  {/* Lead Magnet Confirmation */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 border border-amber-500/20 p-5 mb-6"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-amber-300 mb-1">
                          Introduction Guide and Email Delivery
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          A confirmation email is attempted separately and may not always be delivered.
                          You can open the current {companyName} introduction guide using the button below.
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* CTA Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-3"
                  >
                    <Button
                      onClick={() => window.open("/api/lead-magnet", "_blank", "noopener,noreferrer")}
                      className="w-full sm:w-auto bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-700 hover:via-yellow-600 hover:to-amber-700 text-black font-semibold rounded-xl shadow-lg shadow-amber-600/20 text-sm gap-2 px-8 h-12"
                    >
                      <CalendarCheck className="h-4 w-4" />
                      Open Introduction Guide
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={resetForm}
                      className="text-slate-400 hover:text-slate-300 text-sm gap-2"
                    >
                      <Heart className="h-4 w-4" />
                      Send Another Message
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                /* ═══════════ PAGE 1: LEAD GENERATION FORM ═══════════ */
                <motion.form
                  key="contact-form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  onSubmit={handleSubmit}
                  className="p-6 sm:p-8 lg:p-10 rounded-3xl bg-white/[0.03] border border-white/[0.06] space-y-6"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                      <Send className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Request a Consultation</h3>
                      <p className="text-xs text-slate-500">Beta walkthrough request; scheduling is subject to availability</p>
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
                          id="contact-fullname"
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
                          id="contact-email"
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
                          id="contact-phone"
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
                          id="contact-company"
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
                        id="contact-team-size"
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
                        id="contact-industry"
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
                    <div className="grid grid-cols-2 gap-3">
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
                          </div>
                          <span className="text-xs font-medium">{ct.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Row 6: Calendly Widget (replaces manual date/time/availability) */}
                  {calendlyWidgetVisible && calendlyEmbedUrl && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-2"
                    >
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
                            The scheduling provider reported this time slot as booked.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Row 7: Message */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Tell us about your needs</label>
                    <Textarea
                      id="contact-message"
                      name="message"
                      autoComplete="off"
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onLegalClick) {
                          onLegalClick("privacy");
                        } else {
                          window.location.href = "/privacy";
                        }
                      }}
                      className="text-slate-500 underline hover:text-amber-400 transition-colors"
                    >
                      Privacy Policy
                    </button>
                    . Follow-up timing varies during the beta.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
