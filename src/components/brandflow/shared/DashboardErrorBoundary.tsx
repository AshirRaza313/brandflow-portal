"use client";

import React, { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Dashboard Error Boundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleLogout = () => {
    try {
      localStorage.removeItem("valtriox-user");
      localStorage.removeItem("valtriox-org");
      localStorage.removeItem("valtriox-brandname");
      localStorage.removeItem("valtriox-logo");
      localStorage.removeItem("valtriox-tagline");
      localStorage.removeItem("valtriox-configured");
    } catch {}
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-5 h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              Something Went Wrong
            </h2>
            <p className="text-sm text-slate-400 mb-1">
              The dashboard encountered an unexpected error.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto font-mono bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                {this.state.error.message}
              </p>
            )}
            {!this.state.error?.message && (
              <p className="text-xs text-slate-500 mb-5">
                Please try again or contact support if the issue persists.
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={this.handleReset}
                className="btn-gold rounded-xl text-sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={this.handleLogout}
                variant="outline"
                className="rounded-xl text-sm border-white/10 text-slate-300 hover:bg-white/5"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
