"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Search, ThumbsUp, Package } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
    </div>
  );
}

export function ReviewsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Product Reviews</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor and manage customer feedback</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Sidebar */}
        <Card>
          <CardContent className="p-4">
            <div className="text-center mb-4">
              <p className="text-4xl font-bold text-slate-900">—</p>
              <StarRating rating={0} />
              <p className="text-sm text-muted-foreground mt-1">0 reviews</p>
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search reviews..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-1">
              {["all", "published", "pending", "flagged"].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>{s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {["all", "5", "4", "3", "2", "1"].map((r) => (
                <button key={r} onClick={() => setRatingFilter(r)} className={`px-2 py-1.5 rounded-lg text-xs font-medium ${ratingFilter === r ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{r === "all" ? "All" : `${r}★`}</button>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No reviews yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">Product reviews will appear here once customers leave feedback.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
