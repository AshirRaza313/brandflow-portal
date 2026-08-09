"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, Save, CheckCircle2, XCircle, MessageSquare, BarChart3, Settings, Key, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

export function WhatsAppIntegrationPage() {
  const { appTheme, organization } = useValtrioxStore();
  const isDark = appTheme === "dark" || appTheme === "premium-dark";
  const [activeTab, setActiveTab] = useState("api-settings");
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: "", category: "utility", body: "", language: "en" });
  const [templates, setTemplates] = useState<{ id: number; name: string; category: string; body: string; language: string }[]>([]);
  const [apiSettings, setApiSettings] = useState({
    phoneNumberId: "",
    businessAccountId: "",
    apiToken: "",
    webhookUrl: "",
    verifyToken: "",
  });

  const handleCreateTemplate = () => {
    if (!templateForm.name.trim()) { toast.error("Template name is required"); return; }
    if (!templateForm.body.trim()) { toast.error("Template body is required"); return; }
    setTemplates(prev => [{ id: Date.now(), ...templateForm }, ...prev]);
    setTemplateOpen(false);
    setTemplateForm({ name: "", category: "utility", body: "", language: "en" });
    toast.success("Template created successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={isDark ? "text-2xl font-bold text-white" : "text-2xl font-bold text-slate-900"}>WhatsApp Integration</h1>
          <p className="text-sm text-slate-500 mt-1">Configure WhatsApp Business API</p>
        </div>
        <Badge className={`text-xs ${connected ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"} border-0`}>
          {connected ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</> : <><XCircle className="h-3 w-3 mr-1" /> Disconnected</>}
        </Badge>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {[
          { id: "api-settings", label: "API Settings" },
          { id: "templates", label: "Templates" },
          { id: "analytics", label: "Analytics" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={isDark ? `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-300"}` : `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "api-settings" && (
          <motion.div key="api-settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="max-w-2xl">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="h-5 w-5" /> API Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="mb-1 block">Phone Number ID</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={apiSettings.phoneNumberId} onChange={(e) => setApiSettings({ ...apiSettings, phoneNumberId: e.target.value })} className="pl-9 font-mono" placeholder="Enter Phone Number ID" /></div></div>
                <div><Label className="mb-1 block">Business Account ID</Label><Input value={apiSettings.businessAccountId} onChange={(e) => setApiSettings({ ...apiSettings, businessAccountId: e.target.value })} className="font-mono" placeholder="Enter Business Account ID" /></div>
                <div><Label className="mb-1 block">API Token</Label><div className="relative"><Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="password" value={apiSettings.apiToken} onChange={(e) => setApiSettings({ ...apiSettings, apiToken: e.target.value })} className="pl-9 font-mono" placeholder="Enter API Token" /></div></div>
                <div><Label className="mb-1 block">Webhook URL</Label><Input value={apiSettings.webhookUrl} onChange={(e) => setApiSettings({ ...apiSettings, webhookUrl: e.target.value })} className="font-mono" placeholder="Enter Webhook URL" /></div>
                <div><Label className="mb-1 block">Verify Token</Label><Input value={apiSettings.verifyToken} onChange={(e) => setApiSettings({ ...apiSettings, verifyToken: e.target.value })} className="font-mono" placeholder="Enter Verify Token" /></div>
                <div className="flex gap-3 pt-2">
                  <Button className="bg-amber-600 hover:bg-amber-700" disabled={saving} onClick={async () => {
                    if (!organization?.id) { toast.error("No organization selected"); return; }
                    setSaving(true);
                    try {
                      const res = await fetchWithAuth("/api/integrations", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          type: "whatsapp-api",
                          provider: "whatsapp",
                          name: "WhatsApp Business API",
                          config: apiSettings,
                        }),
                      });
                      if (res.ok) {
                        toast.success("Settings saved!");
                      } else {
                        const data = await res.json();
                        toast.error(data.error || "Failed to save settings");
                      }
                    } catch {
                      toast.error("Failed to save settings");
                    } finally {
                      setSaving(false);
                    }
                  }}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{saving ? "Saving..." : "Save Settings"}</Button>
                  <Button variant="outline" disabled={connecting} onClick={async () => {
                    if (!organization?.id) { toast.error("No organization selected"); return; }
                    if (connected) {
                      // Disconnect
                      setConnecting(true);
                      try {
                        const res = await fetchWithAuth(`/api/integrations?id=${connectionId}`, { method: "DELETE" });
                        if (res.ok) {
                          setConnected(false);
                          setConnectionId(null);
                          toast.success("Disconnected successfully");
                        } else {
                          toast.error("Failed to disconnect");
                        }
                      } catch {
                        toast.error("Failed to disconnect");
                      } finally {
                        setConnecting(false);
                      }
                    } else {
                      // Connect
                      setConnecting(true);
                      try {
                        const res = await fetchWithAuth("/api/integrations", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            type: "whatsapp-api",
                            provider: "whatsapp",
                            name: "WhatsApp Business API",
                            config: apiSettings,
                          }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setConnectionId(data.connection?.id || null);
                          setConnected(true);
                          toast.success("Connected successfully!");
                        } else {
                          const data = await res.json();
                          toast.error(data.error || "Failed to connect");
                        }
                      } catch {
                        toast.error("Failed to connect");
                      } finally {
                        setConnecting(false);
                      }
                    }
                  }}>{connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{connected ? "Disconnect" : "Connect"}</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "templates" && (
          <motion.div key="templates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex justify-end">
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setTemplateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Template</Button>
            </div>
            <Card className="mt-4">
              <CardContent className="p-8">
                <EmptyState
                  icon={MessageSquare}
                  title="No message templates"
                  description="Create WhatsApp message templates for order confirmations, shipping updates, and promotions."
                  action={{ label: "Add Template", onClick: () => setTemplateOpen(true) }}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "analytics" && (
          <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Messages Sent", value: "0" },
                { label: "Delivery Rate", value: "-" },
                { label: "Read Rate", value: "-" },
                { label: "Reply Rate", value: "-" },
              ].map((item) => (
                <Card key={item.label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-xl font-bold">{item.value}</p></CardContent></Card>
              ))}
            </div>
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Detailed Analytics</h3>
                <p className="text-sm text-muted-foreground">Message analytics will be available after 24 hours of data collection.</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Create Message Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1 block">Template Name</Label>
              <Input placeholder="e.g., order_confirmation" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Category</Label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={templateForm.category} onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}>
                <option value="utility">Utility</option>
                <option value="marketing">Marketing</option>
                <option value="authentication">Authentication</option>
                <option value="transactional">Transactional</option>
              </select>
            </div>
            <div>
              <Label className="mb-1 block">Language</Label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={templateForm.language} onChange={(e) => setTemplateForm({ ...templateForm, language: e.target.value })}>
                <option value="en">English</option>
                <option value="ur">Urdu</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
            <div>
              <Label className="mb-1 block">Template Body</Label>
              <textarea rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" placeholder="Enter template content... Use {{1}}, {{2}} for variables." value={templateForm.body} onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setTemplateOpen(false)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleCreateTemplate}>Create Template</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
