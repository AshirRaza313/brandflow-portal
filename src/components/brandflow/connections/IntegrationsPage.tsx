"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Link2, Webhook, Activity, RefreshCw, Store,
  Plus, Search, ExternalLink, Zap,
} from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";
import { usePlatformIdentity } from "@/lib/platform-identity";

export function IntegrationsPage() {
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;
  const [syncing, setSyncing] = useState<string | null>(null);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [marketplaceSearch, setMarketplaceSearch] = useState("");

  const availableIntegrations = [
    { id: "woocommerce", name: "WooCommerce", category: "E-Commerce", description: "Sync products, orders, and inventory with your WooCommerce store." },
    { id: "daraz", name: "Daraz", category: "E-Commerce", description: "Connect your Daraz seller account for automated order sync." },
    { id: "shopify", name: "Shopify", category: "E-Commerce", description: "Integrate your Shopify store with real-time data synchronization." },
    { id: "stripe", name: "Stripe", category: "Payments", description: "Accept international card payments securely." },
    { id: "jazzcash", name: "JazzCash", category: "Payments", description: "Enable JazzCash payments for your customers." },
    { id: "easypaisa", name: "EasyPaisa", category: "Payments", description: "Process EasyPaisa payments and transfers." },
    { id: "facebook", name: "Facebook Pixel", category: "Marketing", description: "Track conversions and optimize your Facebook ad campaigns." },
    { id: "google", name: "Google Analytics", category: "Analytics", description: "Monitor traffic, user behavior, and conversion funnels." },
  ];

  const filteredIntegrations = availableIntegrations.filter(i =>
    i.name.toLowerCase().includes(marketplaceSearch.toLowerCase()) ||
    i.category.toLowerCase().includes(marketplaceSearch.toLowerCase())
  );

  const handleSync = (entity: string) => {
    setSyncing(entity);
    setTimeout(() => { setSyncing(null); toast.success(`${entity} synced!`); }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Integrations Hub</h1>
          <p className="text-sm text-slate-500 mt-1">Connect and manage third-party services for your {companyName} portal</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setMarketplaceOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Browse Marketplace
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { title: "Connected Services", value: "0", sub: "0 active", icon: Link2 },
          { title: "Active Webhooks", value: "0", sub: "of 0 total", icon: Webhook },
          { title: "API Calls Today", value: "0", sub: "", icon: Activity },
          { title: "Sync Status", value: "—", sub: "No connections", icon: RefreshCw },
        ].map((stat) => (
          <Card key={stat.title} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                  {stat.sub && <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>}
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="connected" className="space-y-4">
        <TabsList className="bg-slate-100 flex-wrap">
          <TabsTrigger value="connected">Connected</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="sync">Sync Status</TabsTrigger>
        </TabsList>

        <TabsContent value="connected">
          <Card className="border-slate-200">
            <CardContent className="p-8">
              <EmptyState
                icon={Link2}
                title="No integrations connected"
                description="Connect third-party services like WooCommerce, Daraz, Shopify, Stripe, and more to sync your data."
                action={{ label: "Browse Available", onClick: () => setMarketplaceOpen(true) }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="available">
          <Card className="border-slate-200">
            <CardContent className="p-8">
              <EmptyState
                icon={Store}
                title="No integrations available"
                description="Available integrations will appear here once the marketplace is configured."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card className="border-slate-200">
            <CardHeader className="pb-3"><CardTitle className="text-lg font-semibold text-slate-800">Webhook Management</CardTitle></CardHeader>
            <CardContent>
              <EmptyState icon={Webhook} title="No webhooks configured" description="Set up webhooks to receive real-time notifications for events like orders, inventory changes, and payments." />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync">
          <Card className="border-slate-200">
            <CardContent className="p-8">
              <EmptyState
                icon={RefreshCw}
                title="No sync data"
                description="Data sync status will appear once integrations are connected."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={marketplaceOpen} onOpenChange={setMarketplaceOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> Integration Marketplace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input placeholder="Search integrations..." className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm" value={marketplaceSearch} onChange={(e) => setMarketplaceSearch(e.target.value)} />
            </div>
            <div className="space-y-3">
              {filteredIntegrations.map((integration) => (
                <div key={integration.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Zap className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{integration.name}</p>
                        <p className="text-xs text-muted-foreground">{integration.category}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-10">{integration.description}</p>
                  </div>
                  <Button size="sm" variant="outline" className="ml-3 flex-shrink-0" onClick={() => { toast.success(`${integration.name} connection initiated!`); }}>
                    <ExternalLink className="h-3 w-3 mr-1" /> Connect
                  </Button>
                </div>
              ))}
              {filteredIntegrations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No integrations found matching your search.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
