"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Package, Percent, Plus, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const pricingRules = [
  { id: 1, name: "Summer Glow Markup", type: "Percentage Markup", condition: "Category = Skincare", value: "+15%", status: true, priority: 1, products: 24 },
  { id: 2, name: "Bulk Order Discount", type: "Bulk Discount", condition: "Qty > 50 units", value: "-12%", status: true, priority: 2, products: 18 },
  { id: 3, name: "Flash Friday Sale", type: "Flash Sale", condition: "Every Friday, 6PM-10PM", value: "-20%", status: false, priority: 3, products: 42 },
  { id: 4, name: "Wholesale Tier Pricing", type: "Tier Pricing", condition: "100+ units", value: "-25%", status: true, priority: 4, products: 35 },
  { id: 5, name: "Complete Skincare Bundle", type: "Bundle Pricing", condition: "3+ items from Cleanser set", value: "-18%", status: true, priority: 2, products: 12 },
  { id: 6, name: "VIP Customer Markup", type: "Percentage Markup", condition: "Customer Tier = VIP", value: "+5%", status: true, priority: 5, products: 56 },
  { id: 7, name: "Ramadan Special", type: "Flash Sale", condition: "Ramadan Period", value: "-30%", status: false, priority: 1, products: 60 },
  { id: 8, name: "New Launch Premium", type: "Percentage Markup", condition: "New arrival < 30 days", value: "+10%", status: true, priority: 3, products: 8 },
];

const typeColors: Record<string, string> = {
  "Percentage Markup": "bg-amber-100 text-amber-700",
  "Bulk Discount": "bg-blue-100 text-blue-700",
  "Flash Sale": "bg-orange-100 text-orange-700",
  "Tier Pricing": "bg-amber-100 text-amber-700",
  "Bundle Pricing": "bg-pink-100 text-pink-700",
};

const priceHistoryData = [
  { month: "Jan", "Glow Serum": 1200, "Vitamin C Cream": 950, "Hydra Moisturizer": 800, "Retinol Night Oil": 1500 },
  { month: "Feb", "Glow Serum": 1250, "Vitamin C Cream": 980, "Hydra Moisturizer": 820, "Retinol Night Oil": 1500 },
  { month: "Mar", "Glow Serum": 1250, "Vitamin C Cream": 1050, "Hydra Moisturizer": 850, "Retinol Night Oil": 1600 },
  { month: "Apr", "Glow Serum": 1300, "Vitamin C Cream": 1050, "Hydra Moisturizer": 900, "Retinol Night Oil": 1600 },
  { month: "May", "Glow Serum": 1380, "Vitamin C Cream": 1100, "Hydra Moisturizer": 950, "Retinol Night Oil": 1700 },
  { month: "Jun", "Glow Serum": 1380, "Vitamin C Cream": 1150, "Hydra Moisturizer": 950, "Retinol Night Oil": 1750 },
];

const marginData = [
  { product: "Glow Serum", costPrice: 650, retailPrice: 1380, wholesalePrice: 980, margin: 52.9 },
  { product: "Vitamin C Cream", costPrice: 420, retailPrice: 1150, wholesalePrice: 780, margin: 63.5 },
  { product: "Hydra Moisturizer", costPrice: 380, retailPrice: 950, wholesalePrice: 650, margin: 60.0 },
  { product: "Retinol Night Oil", costPrice: 720, retailPrice: 1750, wholesalePrice: 1200, margin: 58.9 },
  { product: "SPF 50 Sunscreen", costPrice: 290, retailPrice: 850, wholesalePrice: 560, margin: 65.9 },
  { product: "Charcoal Face Wash", costPrice: 180, retailPrice: 550, wholesalePrice: 360, margin: 67.3 },
  { product: "Niacinamide Toner", costPrice: 220, retailPrice: 680, wholesalePrice: 450, margin: 67.6 },
  { product: "Cucumber Eye Gel", costPrice: 310, retailPrice: 920, wholesalePrice: 620, margin: 66.3 },
];

export function PricingRulesPage() {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme === "dark" || appTheme === "premium-dark";
  const [rules, setRules] = useState(pricingRules);
  const [showBuilder, setShowBuilder] = useState(false);

  const toggleRule = (id: number) => {
    setRules(rules.map(r => r.id === id ? { ...r, status: !r.status } : r));
  };

  const activeRules = rules.filter(r => r.status).length;
  const revenueImpact = "+PKR 245,800";
  const productsCovered = [...new Set(rules.filter(r => r.status).flatMap(r => Array(r.products).fill(0)))].length;
  const avgMargin = (marginData.reduce((s, m) => s + m.margin, 0) / marginData.length).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={isDark ? "text-2xl font-bold text-slate-200" : "text-2xl font-bold text-slate-800"}>Pricing Rules</h1>
          <p className="text-sm text-slate-500 mt-1">Manage dynamic pricing engine for your cosmetics & skincare catalog</p>
        </div>
        <Button onClick={() => setShowBuilder(!showBuilder)} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4 mr-2" /> New Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Rules</p>
                <p className={isDark ? "text-2xl font-bold text-slate-200 mt-1" : "text-2xl font-bold text-slate-800 mt-1"}>{activeRules}</p>
                <p className="text-xs text-amber-600 mt-1">of {rules.length} total</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Revenue Impact</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{revenueImpact}</p>
                <p className="text-xs text-slate-500 mt-1">this month</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Products Covered</p>
                <p className={isDark ? "text-2xl font-bold text-slate-200 mt-1" : "text-2xl font-bold text-slate-800 mt-1"}>{rules.reduce((s, r) => s + r.products, 0)}</p>
                <p className="text-xs text-slate-500 mt-1">across all rules</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Margin</p>
                <p className={isDark ? "text-2xl font-bold text-slate-200 mt-1" : "text-2xl font-bold text-slate-800 mt-1"}>{avgMargin}%</p>
                <p className="text-xs text-amber-600 mt-1">+2.4% vs last month</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Percent className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList className="bg-slate-100 overflow-x-auto flex-wrap">
          <TabsTrigger value="rules" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">Pricing Rules</TabsTrigger>
          <TabsTrigger value="builder" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">Rule Builder</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">Price History</TabsTrigger>
          <TabsTrigger value="margins" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">Margin Analysis</TabsTrigger>
        </TabsList>

        {/* Pricing Rules Table */}
        <TabsContent value="rules">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className={isDark ? "text-lg font-semibold text-slate-200" : "text-lg font-semibold text-slate-800"}>Active Pricing Rules</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto -mx-3 sm:mx-0 max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-[200px]">Rule Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Priority</TableHead>
                      <TableHead className="text-center">Products</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id} className={!rule.status ? "opacity-50" : ""}>
                        <TableCell className={isDark ? "font-medium text-slate-300" : "font-medium text-slate-700"}>{rule.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={typeColors[rule.type]}>{rule.type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{rule.condition}</TableCell>
                        <TableCell>
                          <span className={`font-semibold ${rule.value.startsWith("+") ? "text-amber-600" : "text-orange-600"}`}>
                            {rule.value}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={rule.status} onCheckedChange={() => toggleRule(rule.id)} className="data-[state=checked]:bg-amber-600" />
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={isDark ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-300" : "inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700"}>
                            {rule.priority}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm text-slate-600">{rule.products}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rule Builder */}
        <TabsContent value="builder">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className={isDark ? "text-lg font-semibold text-slate-200" : "text-lg font-semibold text-slate-800"}>Create New Pricing Rule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={isDark ? "text-sm font-medium text-slate-300" : "text-sm font-medium text-slate-700"}>Rule Name</Label>
                  <Input placeholder="e.g., Eid Collection Markup" className="border-slate-300 focus:border-amber-500" />
                </div>
                <div className="space-y-2">
                  <Label className={isDark ? "text-sm font-medium text-slate-300" : "text-sm font-medium text-slate-700"}>Rule Type</Label>
                  <Select>
                    <SelectTrigger className="border-slate-300"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage-markup">Percentage Markup</SelectItem>
                      <SelectItem value="bulk-discount">Bulk Discount</SelectItem>
                      <SelectItem value="flash-sale">Flash Sale</SelectItem>
                      <SelectItem value="tier-pricing">Tier Pricing</SelectItem>
                      <SelectItem value="bundle-pricing">Bundle Pricing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className={isDark ? "text-sm font-medium text-slate-300" : "text-sm font-medium text-slate-700"}>Condition</Label>
                  <Input placeholder="e.g., Category = Skincare" className="border-slate-300 focus:border-amber-500" />
                </div>
                <div className="space-y-2">
                  <Label className={isDark ? "text-sm font-medium text-slate-300" : "text-sm font-medium text-slate-700"}>Value (%)</Label>
                  <Input placeholder="e.g., -15 or +10" className="border-slate-300 focus:border-amber-500" />
                </div>
                <div className="space-y-2">
                  <Label className={isDark ? "text-sm font-medium text-slate-300" : "text-sm font-medium text-slate-700"}>Priority</Label>
                  <Select>
                    <SelectTrigger className="border-slate-300"><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5].map(p => <SelectItem key={p} value={String(p)}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className={isDark ? "text-sm font-medium text-slate-300" : "text-sm font-medium text-slate-700"}>Applicable Products</Label>
                  <Select>
                    <SelectTrigger className="border-slate-300"><SelectValue placeholder="Select products" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="skincare">Skincare</SelectItem>
                      <SelectItem value="makeup">Makeup</SelectItem>
                      <SelectItem value="haircare">Hair Care</SelectItem>
                      <SelectItem value="fragrance">Fragrance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <Switch defaultChecked className="data-[state=checked]:bg-amber-600" />
                  <Label className="text-sm text-slate-600">Enable rule immediately</Label>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button className="bg-amber-600 hover:bg-amber-700"><DollarSign className="h-4 w-4 mr-2" /> Create Rule</Button>
                <Button variant="outline" className="border-slate-300">Save as Draft</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price History Chart */}
        <TabsContent value="history">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className={isDark ? "text-lg font-semibold text-slate-200" : "text-lg font-semibold text-slate-800"}>Price History (6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceHistoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(v) => `PKR ${v}`} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} formatter={(v: number) => [`PKR ${v}`, ""]} />
                    <Legend />
                    <Line type="monotone" dataKey="Glow Serum" stroke="#D4AF37" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Vitamin C Cream" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Hydra Moisturizer" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Retinol Night Oil" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Margin Analysis */}
        <TabsContent value="margins">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className={isDark ? "text-lg font-semibold text-slate-200" : "text-lg font-semibold text-slate-800"}>Margin Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto -mx-3 sm:mx-0 max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                      <TableHead className="text-right">Retail Price</TableHead>
                      <TableHead className="text-right">Wholesale Price</TableHead>
                      <TableHead className="text-right">Margin %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marginData.map((item) => (
                      <TableRow key={item.product}>
                        <TableCell className={isDark ? "font-medium text-slate-300" : "font-medium text-slate-700"}>{item.product}</TableCell>
                        <TableCell className="text-right text-slate-600">PKR {item.costPrice}</TableCell>
                        <TableCell className={isDark ? "text-right font-medium text-slate-200" : "text-right font-medium text-slate-800"}>PKR {item.retailPrice}</TableCell>
                        <TableCell className="text-right text-slate-600">PKR {item.wholesalePrice}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className={item.margin >= 60 ? "bg-amber-100 text-amber-700" : "bg-amber-100 text-amber-700"}>
                            {item.margin}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
