"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Share2, Users, Gift, DollarSign, Copy, Link, QrCode } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useBrandForgeStore } from "@/store/brandflow-store";

export function ReferralPage() {
  const { appTheme } = useBrandForgeStore();
  const isDark = appTheme !== "light";

  const referralCode = "";
  const referralLink = "";

  const [qrOpen, setQrOpen] = useState(false);
  const [qrForm, setQrForm] = useState({ url: "", size: "medium" });

  const handleGenerateQR = () => {
    if (!qrForm.url.trim()) { toast.error("URL is required"); return; }
    setQrOpen(false);
    setQrForm({ url: "", size: "medium" });
    toast.success("QR code generated successfully!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Referral Program</h1>
        <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Grow your business through word-of-mouth</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-emerald-500" /><p className="text-xs text-muted-foreground">Total Referrals</p></div><p className={`text-xl font-bold ${isDark ? "text-white" : ""}`}>0</p></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><Gift className="h-4 w-4 text-blue-500" /><p className="text-xs text-muted-foreground">Converted</p></div><p className={`text-xl font-bold ${isDark ? "text-white" : ""}`}>0</p></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-amber-500" /><p className="text-xs text-muted-foreground">Rewards Given</p></div><p className={`text-xl font-bold ${isDark ? "text-white" : ""}`}>Rs. 0</p></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><Share2 className="h-4 w-4 text-purple-500" /><p className="text-xs text-muted-foreground">Conversion Rate</p></div><p className={`text-xl font-bold ${isDark ? "text-white" : ""}`}>0%</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral Settings */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader><CardTitle className={`text-base flex items-center gap-2 ${isDark ? "text-white" : ""}`}><Share2 className="h-5 w-5 text-emerald-600" /> Program Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className={`text-sm font-medium mb-2 ${isDark ? "text-white" : ""}`}>Referral Code</p>
                <div className="flex items-center gap-2">
                  <div className={`flex-1 p-2 rounded-lg font-mono font-bold text-lg text-center ${isDark ? "bg-slate-800 text-white" : "bg-slate-50"}`}>{referralCode || "—"}</div>
                  <Button variant="outline" size="icon" onClick={() => toast.info("No referral code yet")}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div>
                <p className={`text-sm font-medium mb-2 ${isDark ? "text-white" : ""}`}>Referral Link</p>
                <div className="flex items-center gap-2">
                  <div className={`flex-1 p-2 rounded-lg font-mono text-xs truncate ${isDark ? "bg-slate-800 text-white" : "bg-slate-50"}`}>{referralLink || "—"}</div>
                  <Button variant="outline" size="icon" onClick={() => toast.info("No referral link yet")}><Link className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg border text-center ${isDark ? "bg-emerald-900/30 border-emerald-700" : "bg-emerald-50 border-emerald-200"}`}>
                  <Gift className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                  <p className={`text-sm font-bold ${isDark ? "text-white" : ""}`}>Referrer Gets</p>
                  <p className="text-2xl font-bold text-emerald-600">—</p>
                </div>
                <div className={`p-3 rounded-lg border text-center ${isDark ? "bg-blue-900/30 border-blue-700" : "bg-blue-50 border-blue-200"}`}>
                  <Gift className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                  <p className={`text-sm font-bold ${isDark ? "text-white" : ""}`}>Friend Gets</p>
                  <p className="text-2xl font-bold text-blue-600">—</p>
                </div>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setQrOpen(true)}><QrCode className="mr-2 h-4 w-4" /> Generate QR Code</Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Referrals - Empty */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader><CardTitle className={`text-base ${isDark ? "text-white" : ""}`}>Recent Referrals</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <h3 className={`text-base font-semibold mb-1 ${isDark ? "text-white" : "text-foreground"}`}>No referrals yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">Referrals will appear when customers use your referral code.</p>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader><CardTitle className={`text-base ${isDark ? "text-white" : ""}`}>Top Referrers</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">No referrer data yet.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* QR Code Generation Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className={`max-w-[calc(100vw-2rem)] sm:max-w-lg ${isDark ? "bg-slate-900 border-slate-700" : ""}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Generate QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={isDark ? "text-slate-300" : ""}>Destination URL</Label>
              <Input placeholder="e.g., https://yourstore.com/ref/ABC123" value={qrForm.url} onChange={(e) => setQrForm({ ...qrForm, url: e.target.value })} className={isDark ? "bg-slate-800 border-slate-600 text-white" : ""} />
            </div>
            <div className="space-y-2">
              <Label className={isDark ? "text-slate-300" : ""}>QR Code Size</Label>
              <select
                value={qrForm.size}
                onChange={(e) => setQrForm({ ...qrForm, size: e.target.value })}
                className={`w-full rounded-md border px-3 py-2 text-sm ${isDark ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-200"}`}
              >
                <option value="small">Small (200px)</option>
                <option value="medium">Medium (400px)</option>
                <option value="large">Large (600px)</option>
              </select>
            </div>
            <div className={`p-8 rounded-lg flex items-center justify-center ${isDark ? "bg-slate-800" : "bg-slate-50"}`}>
              <div className="text-center">
                <QrCode className="h-20 w-20 text-slate-300 mx-auto" />
                <p className={`text-xs mt-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>QR code preview will appear here</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleGenerateQR}>Generate QR Code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
