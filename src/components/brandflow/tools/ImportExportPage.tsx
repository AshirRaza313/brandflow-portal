"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, FileSpreadsheet, Database, Package, Users, ShoppingBag, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { usePlatformIdentity } from "@/lib/platform-identity";

export function ImportExportPage() {
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;
  const [activeTab, setActiveTab] = useState("import-data");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    setImporting(true);
    setImportProgress(0);
    const interval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setImporting(false);
          toast.success("Import completed successfully!");
          return 0;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import / Export</h1>
        <p className="text-sm text-slate-500 mt-1">Transfer data in and out of {companyName}</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {[
          { id: "import-data", label: "Import Data" },
          { id: "export-data", label: "Export Data" },
          { id: "backup", label: "Backup" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "import-data" && (
          <motion.div key="import" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: "products", label: "Products", icon: Package, description: "Import product catalog from CSV/Excel", color: "bg-amber-100 text-amber-700" },
                { id: "customers", label: "Customers", icon: Users, description: "Import customer list from CSV/Excel", color: "bg-blue-100 text-blue-700" },
                { id: "orders", label: "Orders", icon: ShoppingBag, description: "Import order history from CSV/Excel", color: "bg-amber-100 text-amber-700" },
              ].map((type) => (
                <Card key={type.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => toast.info(`Select "${type.label}" to import`)}>
                  <CardContent className="p-4 text-center">
                    <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 ${type.color}`}><type.icon className="h-6 w-6" /></div>
                    <h3 className="font-semibold text-sm">{type.label}</h3>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="p-6">
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer hover:border-amber-300 hover:bg-amber-50`}
                  onClick={() => fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">Drag & drop your file here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports CSV, XLSX, XLS (max 10MB)</p>
                </div>
                {importing && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Importing...</span>
                      <span className="font-medium">{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "export-data" && (
          <motion.div key="export" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {[
              { id: "products", label: "Product Catalog", icon: Package, color: "bg-amber-100 text-amber-700" },
              { id: "customers", label: "Customer List", icon: Users, color: "bg-blue-100 text-blue-700" },
              { id: "orders", label: "Order History", icon: ShoppingBag, color: "bg-amber-100 text-amber-700" },
              { id: "analytics", label: "Analytics Report", icon: Database, color: "bg-amber-100 text-amber-700" },
            ].map((type) => (
              <Card key={type.id} className="hover:shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${type.color}`}><type.icon className="h-5 w-5" /></div>
                    <div>
                      <h3 className="font-semibold text-sm">{type.label}</h3>
                      <p className="text-xs text-muted-foreground">0 records</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.success("Exporting CSV...")}>
                      <Download className="h-3.5 w-3.5 mr-1" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.success("Exporting Excel...")}>
                      <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}

        {activeTab === "backup" && (
          <motion.div key="backup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex justify-between items-center">
              <Card className="flex-1 mr-4">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Database className="h-8 w-8 text-amber-600" />
                    <div>
                      <p className="font-semibold text-sm">Auto Backup</p>
                      <p className="text-xs text-muted-foreground">Daily at 2:00 AM UTC</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => toast.success("Backup started!")}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Backup Now
              </Button>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Backup History</CardTitle></CardHeader>
              <CardContent>
                <EmptyState
                  icon={Database}
                  title="No backup history yet"
                  description="Automatic backups will appear here once scheduled or manually triggered."
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
