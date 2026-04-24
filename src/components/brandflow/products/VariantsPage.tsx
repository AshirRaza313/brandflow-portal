"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Hash, AlertTriangle, Zap, Plus, Upload, ArrowUpDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const sizes = ["30ml", "50ml", "100ml", "150ml"];
const colors = ["Rose", "Lavender", "Clear", "Peach"];
const materials = ["Glass", "Plastic", "Recyclable"];

const variantMatrix: Record<string, Record<string, number>> = {
  "30ml-Rose-Glass": 45, "30ml-Rose-Plastic": 120, "30ml-Lavender-Glass": 32, "30ml-Lavender-Plastic": 88,
  "50ml-Rose-Glass": 67, "50ml-Rose-Plastic": 150, "50ml-Lavender-Glass": 55, "50ml-Lavender-Plastic": 130,
  "100ml-Rose-Glass": 28, "100ml-Rose-Plastic": 95, "100ml-Lavender-Glass": 22, "100ml-Lavender-Plastic": 78,
  "150ml-Rose-Glass": 12, "150ml-Rose-Plastic": 60, "150ml-Lavender-Glass": 8, "150ml-Lavender-Plastic": 42,
};

const variants = [
  { id: 1, sku: "GS-30M-RO-GL", product: "Glow Serum", size: "30ml", color: "Rose", material: "Glass", stock: 45, price: 1200, status: "Active" },
  { id: 2, sku: "GS-50M-RO-GL", product: "Glow Serum", size: "50ml", color: "Rose", material: "Glass", stock: 67, price: 1800, status: "Active" },
  { id: 3, sku: "GS-100M-RO-PL", product: "Glow Serum", size: "100ml", color: "Rose", material: "Plastic", stock: 95, price: 2800, status: "Active" },
  { id: 4, sku: "VCC-50M-LA-GL", product: "Vitamin C Cream", size: "50ml", color: "Lavender", material: "Glass", stock: 3, price: 1650, status: "Low Stock" },
  { id: 5, sku: "HM-30M-CL-RC", product: "Hydra Moisturizer", size: "30ml", color: "Clear", material: "Recyclable", stock: 0, price: 890, status: "Out of Stock" },
  { id: 6, sku: "RNO-50M-PC-GL", product: "Retinol Night Oil", size: "50ml", color: "Peach", material: "Glass", stock: 120, price: 2200, status: "Active" },
  { id: 7, sku: "SS-100M-CL-PL", product: "SPF 50 Sunscreen", size: "100ml", color: "Clear", material: "Plastic", stock: 200, price: 1150, status: "Active" },
  { id: 8, sku: "CET-30M-LA-GL", product: "Cucumber Eye Gel", size: "30ml", color: "Lavender", material: "Glass", stock: 8, price: 980, status: "Low Stock" },
  { id: 9, sku: "GS-150M-RO-PL", product: "Glow Serum", size: "150ml", color: "Rose", material: "Plastic", stock: 60, price: 3800, status: "Active" },
  { id: 10, sku: "NT-50M-CL-RC", product: "Niacinamide Toner", size: "50ml", color: "Clear", material: "Recyclable", stock: 150, price: 720, status: "Active" },
];

const stockBySize = [
  { size: "30ml", Rose: 165, Lavender: 120, Clear: 90, Peach: 45 },
  { size: "50ml", Rose: 217, Lavender: 185, Clear: 200, Peach: 120 },
  { size: "100ml", Rose: 123, Lavender: 100, Clear: 340, Peach: 80 },
  { size: "150ml", Rose: 72, Lavender: 50, Clear: 110, Peach: 35 },
];

const stockByColor = [
  { color: "Rose", Glass: 152, Plastic: 425, Recyclable: 0 },
  { color: "Lavender", Glass: 117, Plastic: 336, Recyclable: 30 },
  { color: "Clear", Glass: 0, Plastic: 540, Recyclable: 240 },
  { color: "Peach", Glass: 90, Plastic: 180, Recyclable: 0 },
];

export function VariantsPage() {
  const [selectedVariants, setSelectedVariants] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState("");

  const totalProducts = 4;
  const totalSKUs = variants.length;
  const lowStock = variants.filter(v => v.status === "Low Stock" || v.status === "Out of Stock").length;
  const activeCombos = Object.keys(variantMatrix).filter(k => variantMatrix[k] > 0).length;

  const toggleVariant = (id: number) => {
    setSelectedVariants(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const statusColor: Record<string, string> = {
    "Active": "bg-emerald-100 text-emerald-700",
    "Low Stock": "bg-amber-100 text-amber-700",
    "Out of Stock": "bg-red-100 text-red-700",
  };

  const getStockColor = (stock: number) => {
    if (stock === 0) return "text-red-600 font-semibold";
    if (stock < 10) return "text-amber-600 font-semibold";
    return "text-emerald-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Product Variants</h1>
          <p className="text-sm text-slate-500 mt-1">Manage size, color, and material combinations for your products</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Add Variant
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Products with Variants</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{totalProducts}</p>
                <p className="text-xs text-slate-500 mt-1">active products</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Layers className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Variant SKUs</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{totalSKUs}</p>
                <p className="text-xs text-emerald-600 mt-1">+3 this week</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Hash className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Low Stock Variants</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{lowStock}</p>
                <p className="text-xs text-amber-600 mt-1">needs attention</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Combos</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCombos}</p>
                <p className="text-xs text-slate-500 mt-1">of {Object.keys(variantMatrix).length} possible</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Zap className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList className="bg-slate-100 overflow-x-auto flex-wrap">
          <TabsTrigger value="matrix" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Variant Matrix</TabsTrigger>
          <TabsTrigger value="list" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Variant List</TabsTrigger>
          <TabsTrigger value="add" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Add Variant</TabsTrigger>
          <TabsTrigger value="stock" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Stock Analysis</TabsTrigger>
          <TabsTrigger value="bulk" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Bulk Update</TabsTrigger>
        </TabsList>

        {/* Variant Matrix */}
        <TabsContent value="matrix">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-800">
                Glow Serum — Variant Matrix
                <span className="text-sm font-normal text-slate-500 ml-2">(Size × Color)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3 text-left text-sm font-medium text-slate-500 border-b border-slate-200">Size ↓ / Color →</th>
                      {colors.map(c => (
                        <th key={c} className="p-3 text-center text-sm font-medium text-slate-500 border-b border-slate-200">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizes.map(size => (
                      <tr key={size}>
                        <td className="p-3 text-sm font-medium text-slate-700 border-b border-slate-100">{size}</td>
                        {colors.map(color => {
                          const key = `${size}-${color}-Glass`;
                          const stock = variantMatrix[key] || 0;
                          return (
                            <td key={color} className="p-3 text-center border-b border-slate-100">
                              <div className={`inline-flex items-center justify-center h-10 w-16 rounded-lg text-sm font-semibold ${stock === 0 ? "bg-red-50 text-red-600" : stock < 20 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                                {stock}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-100" /> 20+ units</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-100" /> 1-19 units</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-100" /> Out of stock</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Variant List */}
        <TabsContent value="list">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-800">All Variants</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto -mx-3 sm:mx-0 max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs text-slate-600">{v.sku}</TableCell>
                        <TableCell className="font-medium text-slate-700">{v.product}</TableCell>
                        <TableCell><Badge variant="outline" className="border-slate-300">{v.size}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="border-slate-300">{v.color}</Badge></TableCell>
                        <TableCell className="text-sm text-slate-600">{v.material}</TableCell>
                        <TableCell className={`text-right ${getStockColor(v.stock)}`}>{v.stock}</TableCell>
                        <TableCell className="text-right font-medium text-slate-800">PKR {v.price}</TableCell>
                        <TableCell><Badge variant="secondary" className={statusColor[v.status]}>{v.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add Variant Form */}
        <TabsContent value="add">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-800">Add New Variant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Product</Label>
                  <Select>
                    <SelectTrigger className="border-slate-300"><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="glow-serum">Glow Serum</SelectItem>
                      <SelectItem value="vitamin-c-cream">Vitamin C Cream</SelectItem>
                      <SelectItem value="hydra-moisturizer">Hydra Moisturizer</SelectItem>
                      <SelectItem value="retinol-night-oil">Retinol Night Oil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Size</Label>
                  <Select>
                    <SelectTrigger className="border-slate-300"><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                      {sizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Color</Label>
                  <Select>
                    <SelectTrigger className="border-slate-300"><SelectValue placeholder="Select color" /></SelectTrigger>
                    <SelectContent>
                      {colors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Material</Label>
                  <Select>
                    <SelectTrigger className="border-slate-300"><SelectValue placeholder="Select material" /></SelectTrigger>
                    <SelectContent>
                      {materials.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Stock Quantity</Label>
                  <Input type="number" placeholder="0" className="border-slate-300 focus:border-emerald-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Price (PKR)</Label>
                  <Input type="number" placeholder="0" className="border-slate-300 focus:border-emerald-500" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Variant Image</Label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500">Drag & drop or click to upload</p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                </div>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-2" /> Create Variant</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock by Variant */}
        <TabsContent value="stock">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-slate-800">Stock by Size</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockBySize}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="size" tick={{ fill: "#64748b", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                      <Legend />
                      <Bar dataKey="Rose" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Lavender" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Clear" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Peach" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-slate-800">Stock by Color</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockByColor}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="color" tick={{ fill: "#64748b", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                      <Legend />
                      <Bar dataKey="Glass" fill="#64748b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Plastic" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Recyclable" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bulk Update */}
        <TabsContent value="bulk">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-800">Bulk Update Variants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto -mx-3 sm:mx-0 max-h-[260px] overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-12"></TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((v) => (
                      <TableRow key={v.id} className={selectedVariants.includes(v.id) ? "bg-emerald-50" : ""}>
                        <TableCell>
                          <Checkbox checked={selectedVariants.includes(v.id)} onCheckedChange={() => toggleVariant(v.id)} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{v.sku}</TableCell>
                        <TableCell className="text-sm text-slate-700">{v.product}</TableCell>
                        <TableCell className="text-sm text-slate-600">{v.size}</TableCell>
                        <TableCell className="text-sm text-slate-600">{v.color}</TableCell>
                        <TableCell className="text-right text-sm">PKR {v.price}</TableCell>
                        <TableCell className="text-right text-sm">{v.stock}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Action</Label>
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger className="w-[200px] border-slate-300"><SelectValue placeholder="Select action" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price-change">Adjust Price</SelectItem>
                      <SelectItem value="stock-adjust">Adjust Stock</SelectItem>
                      <SelectItem value="activate">Activate</SelectItem>
                      <SelectItem value="deactivate">Deactivate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Value</Label>
                  <Input placeholder="e.g., +10% or 50" className="w-[160px] border-slate-300 focus:border-emerald-500" />
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={selectedVariants.length === 0}>
                  <ArrowUpDown className="h-4 w-4 mr-2" /> Apply ({selectedVariants.length} selected)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
