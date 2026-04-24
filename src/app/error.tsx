"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformIdentity } from "@/lib/platform-identity";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  useEffect(() => {
    console.error("BrandFlow Application Error:", error);
  }, [error]);

  // Clear broken state and redirect to landing page
  const handleReset = () => {
    try {
      localStorage.removeItem("brandflow-user");
      localStorage.removeItem("brandflow-org");
      localStorage.removeItem("brandflow-brandname");
      localStorage.removeItem("brandflow-logo");
      localStorage.removeItem("brandflow-tagline");
      localStorage.removeItem("brandflow-configured");
      localStorage.removeItem("brandflow-theme");
      localStorage.removeItem("brandflow-language");
    } catch {}
    // Full page reload to clear any broken React state
    window.location.href = "/";
  };

  // Back to login — same as reset but explicit
  const handleBackToLogin = () => {
    handleReset();
  };

  // Extract a readable error message
  const errorMessage = error?.message || "An unknown error occurred.";
  const isDbError = errorMessage.includes("DATABASE_URL") || errorMessage.includes("Database connection") || errorMessage.includes("prisma");

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Error Icon */}
        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-white mb-2">
          Something Went Wrong
        </h1>

        {/* Error Description */}
        <p className="text-sm text-slate-400 mb-2">
          {companyName} encountered an unexpected error and could not load the dashboard.
        </p>

        {/* Error Details (collapsible) */}
        <div className="mb-6">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-left">
            <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Error Details</p>
            <p className="text-xs text-red-400 font-mono break-all leading-relaxed">
              {errorMessage}
            </p>
            {error?.digest && (
              <p className="text-[10px] text-slate-600 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>

          {isDbError && (
            <div className="mt-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <p className="text-xs text-amber-400 font-medium mb-1">Database Not Configured</p>
              <p className="text-[11px] text-amber-500/70">
                Go to Vercel &rarr; Project &rarr; Settings &rarr; Environment Variables and add your DATABASE_URL.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleReset}
            className="btn-gold rounded-xl text-sm shadow-[0_0_20px_rgba(212,160,23,0.3)]"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Go to Home
          </Button>
          <Button
            onClick={() => {
              // Try reset first (re-render), if it fails again the error boundary will catch it
              reset();
            }}
            variant="outline"
            className="rounded-xl text-sm border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
          >
            <Home className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>

        <p className="text-[10px] text-slate-600 mt-8">
          If this persists, clear your browser cache and try again, or contact support.
        </p>
      </div>
    </div>
  );
}
