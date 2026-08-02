"use client";

import { useState, useEffect, useCallback } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isPlatformRole } from "@/lib/roles";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { motion } from "framer-motion";
import {
  Shield,
  Save,
  RefreshCw,
  Magnet,
  FileText,
  Mail,
  BarChart3,
  Eye,
  Upload,
  Download,
  BookOpen,
  Edit,
  Send,
  TrendingUp,
  Users,
  FileDown,
} from "lucide-react";

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

export function LeadMagnetManagerPage() {
  const { user, appTheme } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Lead magnet content
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");

  // Stats
  const [stats, setStats] = useState({
    totalSent: 0,
    totalDownloads: 0,
  });

  const hasAccess = Boolean(user?.role && isPlatformRole(user.role));

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200";

  // ── Fetch lead magnet config ──
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || data;
        if (s.leadMagnetTitle) setTitle(s.leadMagnetTitle);
        if (s.leadMagnetDescription) setDescription(s.leadMagnetDescription);
        if (s.leadMagnetEmailSubject) setEmailSubject(s.leadMagnetEmailSubject);
        if (s.leadMagnetEmailBody) setEmailBody(s.leadMagnetEmailBody);
        if (s.leadMagnetPdfUrl) setPdfUrl(s.leadMagnetPdfUrl);
        if (s.leadMagnetSentCount != null) setStats((prev) => ({ ...prev, totalSent: s.leadMagnetSentCount }));
        if (s.leadMagnetDownloadCount != null) setStats((prev) => ({ ...prev, totalDownloads: s.leadMagnetDownloadCount }));
      }
    } catch (err) {
      console.error("[LeadMagnetManagerPage] Failed to fetch lead magnet config:", err);
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasAccess) fetchConfig();
  }, [hasAccess, fetchConfig]);

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadMagnetTitle: title,
          leadMagnetDescription: description,
          leadMagnetEmailSubject: emailSubject,
          leadMagnetEmailBody: emailBody,
          leadMagnetPdfUrl: pdfUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      toast.success("Lead magnet configuration saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    const url = pdfUrl || "/api/lead-magnet";
    const link = document.createElement("a");
    link.href = url;
    link.download = "valtriox-platform-guide.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("PDF downloaded");
  };

  if (!hasAccess) return <AccessDenied />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl font-bold flex items-center gap-2", textPrimary)}>
            <Magnet className="h-6 w-6 text-amber-500" />
            Lead Magnet Manager
          </h1>
          <p className={cn("text-sm mt-0.5", textSecondary)}>
            Manage lead magnet content, email templates, and track engagement
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Save className={cn("h-4 w-4", saving && "animate-spin")} />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Sent", value: stats.totalSent, icon: Send, color: isGold ? "from-amber-500 to-amber-700" : "from-amber-500 to-amber-600" },
          { label: "Downloads", value: stats.totalDownloads, icon: FileDown, color: isGold ? "from-amber-500 to-amber-700" : "from-amber-500 to-amber-600" },
          { label: "Conversion Rate", value: stats.totalSent > 0 ? `${Math.round((stats.totalDownloads / stats.totalSent) * 100)}%` : "N/A", icon: TrendingUp, color: isGold ? "from-amber-500 to-amber-700" : "from-amber-500 to-amber-600" },
          { label: "PDF Status", value: pdfUrl ? "Active" : "Not Set", icon: FileText, color: isGold ? "from-amber-500 to-amber-700" : "from-amber-500 to-amber-600" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={cn(cardBg)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br text-white shadow-sm", stat.color)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={cn("text-xs", textSecondary)}>{stat.label}</p>
                    <p className={cn("text-lg font-bold", isGold ? "text-amber-400" : "text-amber-600")}>{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="email">Email Template</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4 space-y-4">
          <Card className={cn(cardBg)}>
            <CardHeader>
              <CardTitle className={cn("text-base font-semibold", textPrimary)}>Lead Magnet Content</CardTitle>
              <CardDescription className={textSecondary}>Configure the lead magnet title, description, and PDF</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className={textSecondary}>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Valtriox Platform Guide"
                />
              </div>
              <div className="space-y-2">
                <Label className={textSecondary}>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A comprehensive guide to setting up and maximizing Valtriox..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className={textSecondary}>PDF URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    placeholder="/api/lead-magnet"
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={handleDownloadPdf} className="gap-2 flex-shrink-0">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-4 space-y-4">
          <Card className={cn(cardBg)}>
            <CardHeader>
              <CardTitle className={cn("text-base font-semibold", textPrimary)}>Email Template</CardTitle>
              <CardDescription className={textSecondary}>Configure the email sent to leads after form submission</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className={textSecondary}>Email Subject Line</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Your Valtriox Platform Guide is Ready! 📚"
                />
              </div>
              <div className="space-y-2">
                <Label className={textSecondary}>Email Body (Plain Text / HTML)</Label>
                <Textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder={`Hi {{name}},\n\nThank you for your interest in Valtriox! Your platform guide is ready.\n\nDownload it here: {{pdfUrl}}\n\nBest regards,\nThe Valtriox Team`}
                  rows={10}
                  className="font-mono text-xs"
                />
                <p className={cn("text-xs", textSecondary)}>
                  Available variables: {"{{name}}"}, {"{{email}}"}, {"{{pdfUrl}}"}, {"{{companyName}}"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-4 space-y-4">
          <Card className={cn(cardBg)}>
            <CardHeader>
              <CardTitle className={cn("text-base font-semibold", textPrimary)}>Email Preview</CardTitle>
              <CardDescription className={textSecondary}>Preview how the lead magnet email will look</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "rounded-xl border p-6 space-y-4 max-w-lg mx-auto",
                isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50"
              )}>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200/50">
                  <Mail className={cn("h-4 w-4", isGold ? "text-amber-400" : "text-amber-600")} />
                  <span className={cn("text-sm font-medium", textPrimary)}>
                    {emailSubject || "Your Valtriox Platform Guide is Ready! 📚"}
                  </span>
                </div>
                <div className={cn("text-sm leading-relaxed", textSecondary)}>
                  <p>Hi John,</p>
                  <p className="mt-2">
                    {description || "Thank you for your interest! Your comprehensive platform guide is ready for download."}
                  </p>
                  <div className={cn("mt-4 p-3 rounded-lg inline-flex items-center gap-2", isGold ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200")}>
                    <BookOpen className={cn("h-4 w-4", isGold ? "text-amber-400" : "text-amber-600")} />
                    <span className={cn("text-sm font-medium", isGold ? "text-amber-400" : "text-amber-600")}>
                      {title || "Valtriox Platform Guide"}
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">Best regards,<br />The Valtriox Team</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
