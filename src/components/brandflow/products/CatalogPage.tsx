"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Package, Search, Download, Filter, DollarSign, Plus } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useBrandOnyxStore } from "@/store/brandflow-store";

export function CatalogPage() {
  const { setActiveSection } = useBrandOnyxStore();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showWholesale, setShowWholesale] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catalog / Price List</h1>
          <p className="text-sm text-slate-500 mt-1">Shareable product catalog with pricing</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="text-xs" onClick={() => setShowWholesale(!showWholesale)}>
            <Filter className="mr-2 h-4 w-4" /> Toggle Wholesale
          </Button>
          <Button variant="outline" className="text-xs" onClick={() => toast.success("PDF catalog exported successfully!")}>
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
          <Button variant="outline" className="text-xs" onClick={() => toast.info("Share link copied!")}>
            <DollarSign className="mr-2 h-4 w-4" /> Share Link
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        <button onClick={() => setShowWholesale(false)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!showWholesale ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>Retail Price</button>
        <button onClick={() => setShowWholesale(true)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showWholesale ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>Wholesale Price</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search catalog..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No products in catalog</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">Add products to create your shareable catalog.</p>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setActiveSection("add-product")}>
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
