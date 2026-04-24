"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Crown, Star, Gift, Users } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useBrandForgeStore } from "@/store/brandflow-store";

const subTabs = [
  { id: "tiers", label: "Tiers" },
  { id: "rewards", label: "Rewards" },
  { id: "points", label: "Points History" },
];

const tiers = [
  { id: "bronze", name: "Bronze", icon: Star, color: "bg-orange-100 text-orange-700 border-orange-300", progressColor: "bg-orange-500", minPoints: 0, maxPoints: 499, benefits: ["1x points", "Birthday discount 5%", "Free shipping on orders Rs. 5,000+"], customers: 0 },
  { id: "silver", name: "Silver", icon: Star, color: "bg-slate-200 text-slate-700 border-slate-300", progressColor: "bg-slate-500", minPoints: 500, maxPoints: 1999, benefits: ["1.5x points", "Birthday discount 10%", "Free shipping on all orders", "Early access to sales"], customers: 0 },
  { id: "gold", name: "Gold", icon: Crown, color: "bg-amber-100 text-amber-700 border-amber-300", progressColor: "bg-amber-500", minPoints: 2000, maxPoints: 4999, benefits: ["2x points", "Birthday discount 15%", "Free express shipping", "Early access + exclusive deals", "Free product samples"], customers: 0 },
  { id: "platinum", name: "Platinum", icon: Crown, color: "bg-purple-100 text-purple-700 border-purple-300", progressColor: "bg-purple-500", minPoints: 5000, maxPoints: 99999, benefits: ["3x points", "Birthday discount 25%", "Free same-day delivery", "VIP access to all events", "Personal shopper", "Annual gift box"], customers: 0 },
];

interface Reward {
  id: number;
  name: string;
  description: string;
  pointsCost: number;
  type: string;
  createdAt: string;
}

export function LoyaltyPage() {
  const { appTheme } = useBrandForgeStore();
  const isDark = appTheme !== "light";

  const [activeTab, setActiveTab] = useState("tiers");
  const [rewards, setRewards] = useState<Reward[]>([]);

  // Configure Program dialog
  const [configOpen, setConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState({ pointsPerDollar: "1", welcomeBonus: "100", referralBonus: "50", pointsExpiry: "365" });

  // Add Reward dialog
  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardForm, setRewardForm] = useState({ name: "", description: "", pointsCost: "", type: "discount" });

  const handleSaveConfig = () => {
    setConfigOpen(false);
    toast.success("Loyalty program configured successfully!");
  };

  const handleCreateReward = () => {
    if (!rewardForm.name.trim()) { toast.error("Reward name is required"); return; }
    if (!rewardForm.pointsCost) { toast.error("Points cost is required"); return; }
    setRewards(prev => [{ id: Date.now(), ...rewardForm, pointsCost: parseInt(rewardForm.pointsCost), createdAt: new Date().toISOString() }, ...prev]);
    setRewardOpen(false);
    setRewardForm({ name: "", description: "", pointsCost: "", type: "discount" });
    toast.success("Reward created successfully!");
  };

  const inputCls = isDark ? "bg-slate-800 border-slate-600 text-white" : "";
  const labelCls = isDark ? "text-slate-300" : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Loyalty Program</h1>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Reward your best customers</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setConfigOpen(true)}>Configure Program</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-purple-500" /><p className="text-xs text-muted-foreground">Members</p></div><p className={`text-xl font-bold ${isDark ? "text-white" : ""}`}>0</p></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><Star className="h-4 w-4 text-amber-500" /><p className="text-xs text-muted-foreground">Points Issued</p></div><p className={`text-xl font-bold ${isDark ? "text-white" : ""}`}>0</p></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><Gift className="h-4 w-4 text-emerald-500" /><p className="text-xs text-muted-foreground">Redeemed</p></div><p className={`text-xl font-bold ${isDark ? "text-white" : ""}`}>0</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Engagement</p><p className={`text-xl font-bold ${isDark ? "text-white" : ""}`}>0%</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {subTabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "tiers" && (
          <motion.div key="tiers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tiers.map((tier) => (
                <Card key={tier.id} className={`border-2 ${tier.color}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <tier.icon className="h-6 w-6" />
                        <h3 className="text-lg font-bold">{tier.name}</h3>
                      </div>
                      <span className="text-xs">{tier.customers} members</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{tier.minPoints === 0 ? "0" : tier.minPoints.toLocaleString()} – {tier.maxPoints < 99999 ? tier.maxPoints.toLocaleString() : "∞"} pts</p>
                    <div className="space-y-1 mb-3">
                      {tier.benefits.map((b) => (
                        <p key={b} className="text-sm flex items-center gap-2"><span className="text-emerald-500">✓</span>{b}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "rewards" && (
          <motion.div key="rewards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex justify-end"><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setRewardOpen(true)}>Add Reward</Button></div>
            {rewards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewards.map((r) => (
                  <Card key={r.id} className={isDark ? "border-slate-700" : "border-slate-200"}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Gift className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{r.name}</h4>
                          <p className={`text-xs capitalize ${isDark ? "text-slate-400" : "text-slate-500"}`}>{r.type}</p>
                        </div>
                      </div>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{r.description}</p>
                      <p className="text-sm font-bold text-emerald-600 mt-2">{r.pointsCost} points</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <Gift className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <h3 className={`text-base font-semibold mb-1 ${isDark ? "text-white" : "text-foreground"}`}>No rewards yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">Create rewards for your loyalty program members.</p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {activeTab === "points" && (
          <motion.div key="points" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Star className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <h3 className={`text-base font-semibold mb-1 ${isDark ? "text-white" : "text-foreground"}`}>No points history</h3>
                <p className="text-sm text-muted-foreground max-w-sm">Points transactions will appear as customers earn and redeem points.</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Configure Program Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className={isDark ? "bg-slate-900 border-slate-700" : ""}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Configure Loyalty Program</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Points Per Dollar Spent</Label>
              <Input type="number" placeholder="e.g., 1" value={configForm.pointsPerDollar} onChange={(e) => setConfigForm({ ...configForm, pointsPerDollar: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Welcome Bonus (Points)</Label>
              <Input type="number" placeholder="e.g., 100" value={configForm.welcomeBonus} onChange={(e) => setConfigForm({ ...configForm, welcomeBonus: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Referral Bonus (Points)</Label>
              <Input type="number" placeholder="e.g., 50" value={configForm.referralBonus} onChange={(e) => setConfigForm({ ...configForm, referralBonus: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Points Expiry (Days)</Label>
              <Input type="number" placeholder="e.g., 365" value={configForm.pointsExpiry} onChange={(e) => setConfigForm({ ...configForm, pointsExpiry: e.target.value })} className={inputCls} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveConfig}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Reward Dialog */}
      <Dialog open={rewardOpen} onOpenChange={setRewardOpen}>
        <DialogContent className={isDark ? "bg-slate-900 border-slate-700" : ""}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>Create Reward</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={labelCls}>Reward Name</Label>
              <Input placeholder="e.g., Free Shipping" value={rewardForm.name} onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Description</Label>
              <Textarea placeholder="Describe this reward..." rows={3} value={rewardForm.description} onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })} className={inputCls} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={labelCls}>Type</Label>
                <Select value={rewardForm.type} onValueChange={(v) => setRewardForm({ ...rewardForm, type: v })}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="free-shipping">Free Shipping</SelectItem>
                    <SelectItem value="free-product">Free Product</SelectItem>
                    <SelectItem value="gift-card">Gift Card</SelectItem>
                    <SelectItem value="exclusive-access">Exclusive Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Points Cost</Label>
                <Input type="number" placeholder="e.g., 500" value={rewardForm.pointsCost} onChange={(e) => setRewardForm({ ...rewardForm, pointsCost: e.target.value })} className={inputCls} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRewardOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateReward}>Create Reward</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
