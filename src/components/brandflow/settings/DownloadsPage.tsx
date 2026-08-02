"use client";

import { useState } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isPlatformRole } from "@/lib/roles";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { motion } from "framer-motion";
import {
  Download,
  Search,
  Shield,
  FileText,
  Palette,
  Megaphone,
  Code,
  ShoppingCart,
  Building,
  Calendar,
  Share2,
  PenTool,
  SearchIcon,
  Target,
  Paintbrush,
  Lightbulb,
  Wrench,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────

const PROPOSAL_TEMPLATES = [
  { value: "brand_management", label: "Brand Management", icon: Palette, description: "Brand strategy, visual identity, guidelines & positioning services.", color: "from-amber-500 to-amber-700" },
  { value: "digital_marketing", label: "Digital Marketing", icon: Megaphone, description: "SEO, social media, content strategy & paid advertising campaigns.", color: "from-cyan-500 to-cyan-700" },
  { value: "tech_integration", label: "Technology Integration", icon: Code, description: "API development, workflow automation & third-party integrations.", color: "from-violet-500 to-violet-700" },
  { value: "e_commerce", label: "E-Commerce Setup", icon: ShoppingCart, description: "Online store setup, payment gateway & logistics configuration.", color: "from-pink-500 to-pink-700" },
  { value: "enterprise", label: "Enterprise Solution", icon: Building, description: "Full platform implementation, training & dedicated SLA support.", color: "from-indigo-500 to-indigo-700" },
  { value: "monthly_retainer", label: "Monthly Retainer", icon: Calendar, description: "Ongoing support, maintenance, optimization & monthly reporting.", color: "from-teal-500 to-teal-700" },
  { value: "social_media_management", label: "Social Media Management", icon: Share2, description: "Platform strategy, content creation, community growth & analytics.", color: "from-sky-500 to-sky-700" },
  { value: "content_creation", label: "Content Creation", icon: PenTool, description: "Video production, long-form content & multi-platform distribution.", color: "from-orange-500 to-orange-700" },
  { value: "seo_optimization", label: "SEO Optimization", icon: SearchIcon, description: "Technical SEO, on-page optimization, link building & authority.", color: "from-emerald-500 to-emerald-700" },
  { value: "paid_advertising", label: "Paid Advertising", icon: Target, description: "Campaign strategy, ad creative, management & retargeting.", color: "from-rose-500 to-rose-700" },
  { value: "brand_identity", label: "Brand Identity & Design", icon: Paintbrush, description: "Visual identity, brand voice, collateral & digital assets.", color: "from-fuchsia-500 to-fuchsia-700" },
  { value: "consultation", label: "Consultation & Strategy", icon: Lightbulb, description: "Business audit, digital transformation & growth strategy.", color: "from-yellow-500 to-yellow-700" },
  { value: "custom_development", label: "Custom Development", icon: Wrench, description: "UI/UX design, frontend, backend, testing & deployment.", color: "from-lime-500 to-lime-700" },
];

// ─── Access Denied ──────────────────────────────────────────────────────

function AccessDenied() {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className={cn("max-w-md w-full", isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200")}>
        <CardContent className="flex flex-col items-center text-center p-8">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-red-500" />
          </div>
          <h2 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>
            Access Denied
          </h2>
          <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
            This page is restricted to platform administrators only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function DownloadsPage() {
  const { user, appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  const hasAccess = Boolean(user?.role && isPlatformRole(user.role));

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200";

  const filteredTemplates = PROPOSAL_TEMPLATES.filter(
    (t) =>
      (t.label || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDownloadProposal = async (type: string, label: string) => {
    setDownloading(type);
    try {
      // Generate a blank template proposal PDF
      const res = await fetchWithAuth("/api/admin/proposals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: true,
          type,
          clientName: "Client Name",
          clientEmail: "client@example.com",
          title: `${label} Proposal`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal-template-${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`${label} template downloaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download template");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadLeadMagnet = () => {
    try {
      const link = document.createElement("a");
      link.href = "/api/lead-magnet";
      link.download = "valtriox-platform-guide.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Valtriox Platform Guide downloaded");
    } catch {
      toast.error("Failed to download platform guide");
    }
  };

  if (!hasAccess) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className={cn("text-2xl font-bold flex items-center gap-2", textPrimary)}>
          <Download className="h-6 w-6 text-amber-500" />
          Downloads
        </h1>
        <p className={cn("text-sm mt-0.5", textSecondary)}>
          Download proposal templates and platform resources
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Proposal Templates */}
      <div>
        <h2 className={cn("text-lg font-semibold mb-4 flex items-center gap-2", textPrimary)}>
          <FileText className="h-5 w-5 text-amber-500" />
          Proposal Templates
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template, i) => (
            <motion.div
              key={template.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card
                className={cn(
                  "group transition-all duration-200 hover:shadow-lg",
                  cardBg,
                  isGold && "hover:shadow-amber-500/5"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br text-white shadow-sm",
                        template.color
                      )}
                    >
                      <template.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={cn("text-sm font-semibold mb-0.5", textPrimary)}>
                        {template.label}
                      </h3>
                      <p className={cn("text-xs leading-relaxed line-clamp-2", textSecondary)}>
                        {template.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full mt-3 gap-2 text-xs h-8",
                      isGold && "border-amber-500/20 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                    )}
                    onClick={() => handleDownloadProposal(template.value, template.label)}
                    disabled={downloading === template.value}
                  >
                    {downloading === template.value ? (
                      <>
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        Download PDF
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        {filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12">
            <FileText className="h-8 w-8 text-slate-300" />
            <p className={textSecondary}>No templates match your search.</p>
          </div>
        )}
      </div>

      {/* Lead Magnet */}
      <div>
        <h2 className={cn("text-lg font-semibold mb-4 flex items-center gap-2", textPrimary)}>
          <BookOpen className="h-5 w-5 text-amber-500" />
          Lead Magnet
        </h2>
        <Card
          className={cn(
            "overflow-hidden transition-all duration-200",
            cardBg,
            isGold && "border-amber-500/20"
          )}
        >
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div
                className={cn(
                  "h-16 w-16 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/20"
                )}
              >
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className={cn("text-base font-semibold", textPrimary)}>
                  Valtriox Platform Guide
                </h3>
                <p className={cn("text-sm mt-1", textSecondary)}>
                  Comprehensive introduction to the Valtriox platform - includes features overview, quick-start tips, and best practices for brand management.
                </p>
              </div>
              <Button
                className={cn(
                  "gap-2 bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0",
                  isGold && "bg-amber-500 hover:bg-amber-600 text-black"
                )}
                onClick={handleDownloadLeadMagnet}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
