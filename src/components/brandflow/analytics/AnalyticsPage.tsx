"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingBag, Package, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const subTabs = [
  { id: "sales", label: "Sales" },
  { id: "customers", label: "Customers" },
  { id: "products", label: "Products" },
];

const monthlyRevenue = [
  { month: "Jul", revenue: 32000, orders: 180 },
  { month: "Aug", revenue: 38000, orders: 210 },
  { month: "Sep", revenue: 35000, orders: 195 },
  { month: "Oct", revenue: 42000, orders: 240 },
  { month: "Nov", revenue: 48000, orders: 275 },
  { month: "Dec", revenue: 52000, orders: 310 },
  { month: "Jan", revenue: 48750, orders: 290 },
];

const customerGrowth = [
  { month: "Jul", new: 85, returning: 95 },
  { month: "Aug", new: 102, returning: 108 },
  { month: "Sep", new: 78, returning: 117 },
  { month: "Oct", new: 120, returning: 120 },
  { month: "Nov", new: 145, returning: 130 },
  { month: "Dec", new: 160, returning: 150 },
  { month: "Jan", new: 110, returning: 180 },
];

const topProducts = [
  { name: "SPF 50 Sunscreen", sold: 890, revenue: 31150 },
  { name: "Vitamin C Serum", sold: 620, revenue: 27900 },
  { name: "Hyaluronic Acid", sold: 520, revenue: 28600 },
  { name: "Lip Balm Collection", sold: 480, revenue: 5760 },
  { name: "Charcoal Face Wash", sold: 430, revenue: 12040 },
];

const channelData = [
  { name: "WhatsApp", value: 45 },
  { name: "Instagram", value: 25 },
  { name: "Website", value: 20 },
  { name: "Phone", value: 10 },
];

const pieColors = ["#C9A227", "#8b5cf6", "#3b82f6", "#f59e0b"];

export function AnalyticsPage() {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme === "dark" || appTheme === "premium-dark";
  const [activeTab, setActiveTab] = useState("sales");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className={isDark ? "text-xl sm:text-2xl font-bold text-white" : "text-xl sm:text-2xl font-bold text-slate-900"}>Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Insights and performance metrics</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto tab-bar-scroll">
        {subTabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={isDark ? `px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-300"}` : `px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* SALES TAB */}
      {activeTab === "sales" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-amber-500" /><p className="text-xs text-muted-foreground">Revenue</p></div><p className="text-xl font-bold">Rs. 48,750</p><p className="text-xs text-amber-600 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />12.5%</p></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><ShoppingBag className="h-4 w-4 text-blue-500" /><p className="text-xs text-muted-foreground">Orders</p></div><p className="text-xl font-bold">290</p><p className="text-xs text-amber-600 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />8.3%</p></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-amber-500" /><p className="text-xs text-muted-foreground">Avg Order</p></div><p className="text-xl font-bold">Rs. 168</p><p className="text-xs text-amber-600 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />5.1%</p></CardContent></Card>
            <Card><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><TrendingDown className="h-4 w-4 text-red-500" /><p className="text-xs text-muted-foreground">Refund Rate</p></div><p className="text-xl font-bold">2.3%</p><p className="text-xs text-red-600 flex items-center gap-1"><TrendingDown className="h-3 w-3" />0.5%</p></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Revenue Trend</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[200px] sm:h-[250px] lg:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyRevenue}>
                      <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C9A227" stopOpacity={0.2} /><stop offset="95%" stopColor="#C9A227" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, ""]} />
                      <Area type="monotone" dataKey="revenue" stroke="#C9A227" strokeWidth={2} fill="url(#revGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Sales Channels</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-36 w-36 sm:h-44 sm:w-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={channelData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">{channelData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}</Pie><Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} /></PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
                  {channelData.map((c, i) => (<div key={c.name} className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pieColors[i] }} /><span>{c.name}: {c.value}%</span></div>))}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* CUSTOMERS TAB */}
      {activeTab === "customers" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">1,248</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">New (Jan)</p><p className="text-xl font-bold">110</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Retention</p><p className="text-xl font-bold">62%</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">LTV Avg</p><p className="text-xl font-bold">Rs. 385</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Customer Growth</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[200px] sm:h-[250px] lg:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="new" fill="#C9A227" radius={[4, 4, 0, 0]} name="New" />
                    <Bar dataKey="returning" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Returning" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === "products" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Top Selling Products</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-slate-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">#</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Product</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Units Sold</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Revenue</th>
                </tr></thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={p.name} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                      <td className="py-3 px-4 font-medium">{p.name}</td>
                      <td className="py-3 px-4 text-right">{p.sold.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-amber-600">Rs. {p.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
