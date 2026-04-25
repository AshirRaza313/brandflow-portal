"use client";

import { useEffect, useState, useCallback, Component, ReactNode } from "react";
import dynamic from "next/dynamic";
import { useValtrioxStore } from "@/store/brandflow-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useSubscriptionSync } from "@/hooks/useSubscriptionSync";

// ── Lazy-Loaded Page Components (code-split for performance) ──
import {
  DashboardHome, OrdersPage, ProductsPage, CustomersPage, TasksPage, CalendarPage,
  CatalogPage, ReviewsPage, PricingRulesPage, VariantsPage,
  SalesReportsPage, CustomerReportsPage, ProductReportsPage, RevenueAnalyticsPage, TrafficAnalyticsPage,
  BroadcastsPage, LoyaltyPage, EventsPage, ReferralPage, CouponsPage, MarketingCalendarPage,
  SEOManagerPage, SocialMediaPage, EmailMarketingPage, AdManagerPage, InfluencersPage,
  TeamPage, AttendancePage, PayrollPage, WhatsAppPage,
  ReturnsPage, SLAEnginePage, TicketsPage, PackagingPage, ShippingPage, SuppliersPage, WarehousePage,
  AIAssistantPage, WhatsAppIntegrationPage, ImportExportPage, IntegrationsPage,
  TeamChatPage, SupportChatPage, UserGuidePage,
  SettingsPage, UserManagementPage, AdminDashboard, AuditLogPage,
  SubscriptionPage, PaymentApprovalsPage, AdminSubscriptionsPage, InvoiceManagementPage, PlatformSettingsPage,
} from "@/components/brandflow/lazy-pages";

// ── Auth & Layout Components ──
const AuthScreen = dynamic(
  () => import("@/components/brandflow/auth/AuthScreen").then(m => ({ default: m.AuthScreen })),
  { ssr: false }
);
import { AuthModal } from "@/components/brandflow/auth/AuthModal";
import { cn } from "@/lib/utils";
import { isFeatureAvailableWithOverrides, getFeatureLock } from "@/lib/feature-lock";

// ── Dynamic: Layout components (defers framer-motion from landing page bundle) ──
const Sidebar = dynamic(
  () => import("@/components/brandflow/layout/Sidebar").then(m => ({ default: m.Sidebar })),
  { ssr: false }
);
const Header = dynamic(
  () => import("@/components/brandflow/layout/Header").then(m => ({ default: m.Header })),
  { ssr: false }
);

// ── Dynamic: Shared overlays (framer-motion deferred) ──
const FeatureLockedOverlay = dynamic(
  () => import("@/components/brandflow/shared/FeatureLockedOverlay").then(m => ({ default: m.FeatureLockedOverlay })),
  { ssr: false }
);

// ── Landing Page Components (dynamic — defers framer-motion from initial bundle) ──
import { Footer } from "@/components/brandflow/landing/Footer";
const Navbar = dynamic(() => import("@/components/brandflow/landing/Navbar").then(m => ({ default: m.Navbar })), { ssr: false });
const Hero = dynamic(() => import("@/components/brandflow/landing/Hero").then(m => ({ default: m.Hero })), { ssr: false });
const Features = dynamic(() => import("@/components/brandflow/landing/Features").then(m => ({ default: m.Features })), { ssr: false });
const HowItWorks = dynamic(() => import("@/components/brandflow/landing/HowItWorks").then(m => ({ default: m.HowItWorks })), { ssr: false });
const SocialProof = dynamic(() => import("@/components/brandflow/landing/SocialProof").then(m => ({ default: m.SocialProof })), { ssr: false });
const Pricing = dynamic(() => import("@/components/brandflow/landing/Pricing").then(m => ({ default: m.Pricing })), { ssr: false });
const Testimonials = dynamic(() => import("@/components/brandflow/landing/Testimonials").then(m => ({ default: m.Testimonials })), { ssr: false });
const FAQ = dynamic(() => import("@/components/brandflow/landing/FAQ").then(m => ({ default: m.FAQ })), { ssr: false });
const CTASection = dynamic(() => import("@/components/brandflow/landing/CTASection").then(m => ({ default: m.CTASection })), { ssr: false });

// ── Legal Pages ──
import { PrivacyPolicyPage } from "@/components/brandflow/legal/PrivacyPolicyPage";
import { TermsOfServicePage } from "@/components/brandflow/legal/TermsOfServicePage";
import { RefundPolicyPage } from "@/components/brandflow/legal/RefundPolicyPage";
import { CookiePolicyPage } from "@/components/brandflow/legal/CookiePolicyPage";

// ── Global Components ──
const FloatingEventIcons = dynamic(
  () => import("@/components/brandflow/events/FloatingEventIcons").then(m => ({ default: m.FloatingEventIcons })),
  { ssr: false }
);
import { DashboardErrorBoundary } from "@/components/brandflow/shared/DashboardErrorBoundary";

// ── Inline Error Wrapper for Dashboard Pages ──
// Catches render errors from individual pages without crashing the whole app
function SafePage({ children, fallbackName }: { children: ReactNode; fallbackName: string }) {
  const [error, setError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = useCallback(() => {
    setError(null);
    setRetryKey((k) => k + 1);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h3 className="text-base font-semibold text-white mb-1">Page Error</h3>
          <p className="text-xs text-slate-400 mb-1">{fallbackName} failed to load.</p>
          <p className="text-[10px] text-slate-500 font-mono mb-4 break-all">{error.message}</p>
          <button
            onClick={handleRetry}
            className="text-xs text-amber-400 hover:text-amber-300 underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Error boundary class for catching render errors
class PageErrorBoundary extends Component<{ children: ReactNode; name: string }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode; name: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    console.error(`[PageErrorBoundary] ${this.props.name} crashed:`, error.message);
  }
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center max-w-sm">
            <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Page Error</h3>
            <p className="text-xs text-slate-400 mb-1">{this.props.name} failed to load.</p>
            <p className="text-[10px] text-slate-500 font-mono mb-4 break-all">{this.state.error?.message || 'Unknown error'}</p>
            <button
              onClick={this.handleReset}
              className="text-xs text-amber-400 hover:text-amber-300 underline"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function SafeRender({ children, name }: { children: ReactNode; name: string }) {
  return <PageErrorBoundary name={name}>{children}</PageErrorBoundary>;
}

export default function Home() {
  const { view, activeSection, appTheme, setAppTheme, sidebarCollapsed, setView, setAuthModalOpen, setAuthModalMode, user, organization } = useValtrioxStore();
  const [legalPage, setLegalPage] = useState<string | null>(null);
  const [adminLockedFeatures, setAdminLockedFeatures] = useState<Set<string>>(new Set());
  const [dbNotConfigured, setDbNotConfigured] = useState(false);

  // ── Check if database is configured on mount ──
  useEffect(() => {
    fetch("/api/setup/init")
      .then((res) => res.json())
      .then((data) => {
        if (data.needsDatabase) {
          setDbNotConfigured(true);
        }
      })
      .catch(() => {});
  }, []);

  // ── Real-time subscription sync (polls every 60s for plan changes) ──
  const {
    subscriptionPlan,
    subscriptionStatus,
    isTrialActive,
    trialDaysRemaining,
    isPendingPayment,
    pendingPlanName,
  } = useSubscriptionSync();

  // Fetch admin feature toggles (for feature lock/unlock system)
  // Also refetch when subscription changes (plan change may unlock features)
  useEffect(() => {
    async function fetchToggles() {
      try {
        const res = await fetchWithAuth("/api/admin/feature-toggles");
        if (res.ok) {
          const data = await res.json();
          const locked = new Set<string>();
          if (Array.isArray(data.lockedGrowth)) data.lockedGrowth.forEach((f: string) => locked.add(f));
          if (Array.isArray(data.lockedEnterprise)) data.lockedEnterprise.forEach((f: string) => locked.add(f));
          setAdminLockedFeatures(locked);
        }
      } catch { /* silent */ }
    }
    fetchToggles();
  }, [subscriptionPlan]); // Re-fetch toggles when plan changes

  // Hydrate theme from localStorage on mount (handles SSR mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("valtriox-theme");
      if (saved === "light" || saved === "dark" || saved === "premium-dark") {
        setAppTheme(saved);
      }
    } catch {}
  }, []);

  // Apply theme class to <html> element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "premium-dark");
    if (appTheme === "dark") root.classList.add("dark");
    else if (appTheme === "premium-dark") root.classList.add("premium-dark");
  }, [appTheme]);

  // ── LANDING PAGE ──
  if (view === "landing") {
    const handleAuthClick = (mode: "login" | "signup") => {
      setAuthModalMode(mode);
      setView("auth");
    };

    // ── Legal Page View ──
    if (legalPage) {
      const handleBack = () => setLegalPage(null);
      return (
        <div className="min-h-screen bg-[#0a0a0f]">
          {legalPage === "privacy" && <PrivacyPolicyPage onBack={handleBack} />}
          {legalPage === "terms" && <TermsOfServicePage onBack={handleBack} />}
          {legalPage === "refund" && <RefundPolicyPage onBack={handleBack} />}
          {legalPage === "cookies" && <CookiePolicyPage onBack={handleBack} />}
          <Footer onLegalClick={setLegalPage} />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar onAuthClick={handleAuthClick} />
        <Hero onAuthClick={handleAuthClick} />
        <SocialProof />
        <Features />
        <HowItWorks />
        <Pricing onAuthClick={handleAuthClick} />
        <Testimonials />
        <FAQ />
        <CTASection onAuthClick={handleAuthClick} />
        <Footer onLegalClick={setLegalPage} />
        <AuthModal />
      </div>
    );
  }

  // ── DATABASE NOT CONFIGURED — Show setup page ──
  if (dbNotConfigured) {
    window.location.href = "/setup";
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-400 font-semibold">Database Setup Required</p>
          <p className="text-gray-500 text-sm mt-1">Redirecting to setup page...</p>
        </div>
      </div>
    );
  }

  // ── AUTH SCREEN (fallback, shown if view is "auth") ──
  if (view === "auth") return <AuthScreen />;

  // ── DASHBOARD ──
  const themeBg =
    appTheme === "premium-dark" ? "bg-[#0a0a0f]" :
    appTheme === "dark" ? "bg-slate-950" :
    "bg-slate-50";

  // Helper to check if a section is locked by subscription plan OR admin toggles
  // Platform roles (owner / platform_owner / platform_admin) bypass ALL locks
  const userRole = user?.role || "viewer";

  const checkLock = (sectionId: string, label: string) => {
    if (!isFeatureAvailableWithOverrides(sectionId, subscriptionPlan, userRole, adminLockedFeatures)) {
      const lock = getFeatureLock(sectionId);
      return (
        <FeatureLockedOverlay
          featureId={sectionId}
          featureLabel={label}
          requiredPlan={lock?.minPlan || "growth"}
          currentPlan={subscriptionPlan}
        />
      );
    }
    return null;
  };

  const renderPage = () => {
    switch (activeSection) {
      // ── MAIN (always available) ──
      case "dashboard": return <SafeRender name="Dashboard"><DashboardHome /></SafeRender>;
      case "orders": return <SafeRender name="Orders"><OrdersPage /></SafeRender>;
      case "products": return <SafeRender name="Products"><ProductsPage /></SafeRender>;
      case "customers": return <SafeRender name="Customers"><CustomersPage /></SafeRender>;
      case "tasks": return <SafeRender name="Tasks"><TasksPage /></SafeRender>;
      case "calendar": return <SafeRender name="Calendar"><CalendarPage /></SafeRender>;

      // ── PRODUCTS (always available) ──
      case "add-product": return <SafeRender name="Catalog"><CatalogPage /></SafeRender>;
      case "categories": return <SafeRender name="Products"><ProductsPage /></SafeRender>;
      case "inventory": return <SafeRender name="Products"><ProductsPage /></SafeRender>;
      case "pricing-rules": return <SafeRender name="Pricing Rules"><PricingRulesPage /></SafeRender>;
      case "variants": return <SafeRender name="Variants"><VariantsPage /></SafeRender>;
      case "catalog": return <SafeRender name="Catalog"><CatalogPage /></SafeRender>;
      case "reviews": return <SafeRender name="Reviews"><ReviewsPage /></SafeRender>;

      // ── ANALYTICS ──
      case "sales-analytics": case "sales-reports": return <SafeRender name="Sales Reports"><SalesReportsPage /></SafeRender>;
      case "product-analytics": case "product-reports": return <SafeRender name="Product Reports"><ProductReportsPage /></SafeRender>;
      case "customer-analytics": case "customer-reports": return <SafeRender name="Customer Reports"><CustomerReportsPage /></SafeRender>;
      case "revenue-analytics": {
        const lock = checkLock("revenue-analytics", "Revenue Analytics");
        if (lock) return lock;
        return <SafeRender name="Revenue Analytics"><RevenueAnalyticsPage /></SafeRender>;
      }
      case "traffic-analytics": {
        const lock = checkLock("traffic-analytics", "Traffic Analytics");
        if (lock) return lock;
        return <SafeRender name="Traffic Analytics"><TrafficAnalyticsPage /></SafeRender>;
      }

      // ── MARKETING ──
      case "campaigns": case "broadcasts": {
        const lock = checkLock("campaigns", "Campaigns");
        if (lock) return lock;
        return <SafeRender name="Campaigns"><BroadcastsPage /></SafeRender>;
      }
      case "seo-manager": {
        const lock = checkLock("seo-manager", "SEO Manager");
        if (lock) return lock;
        return <SafeRender name="SEO Manager"><SEOManagerPage /></SafeRender>;
      }
      case "social-media": {
        const lock = checkLock("social-media", "Social Media");
        if (lock) return lock;
        return <SafeRender name="Social Media"><SocialMediaPage /></SafeRender>;
      }
      case "email-marketing": {
        const lock = checkLock("email-marketing", "Email Marketing");
        if (lock) return lock;
        return <SafeRender name="Email Marketing"><EmailMarketingPage /></SafeRender>;
      }
      case "ad-manager": {
        const lock = checkLock("ad-manager", "Ad Manager");
        if (lock) return lock;
        return <SafeRender name="Ad Manager"><AdManagerPage /></SafeRender>;
      }
      case "loyalty": return <SafeRender name="Loyalty"><LoyaltyPage /></SafeRender>;
      case "seasonal-sales": case "events": return <SafeRender name="Events"><EventsPage /></SafeRender>;
      case "influencers": {
        const lock = checkLock("influencers", "Influencers");
        if (lock) return lock;
        return <SafeRender name="Influencers"><InfluencersPage /></SafeRender>;
      }
      case "affiliates": case "referral": {
        const lock = checkLock("affiliates", "Affiliates");
        if (lock) return lock;
        return <SafeRender name="Affiliates"><ReferralPage /></SafeRender>;
      }
      case "coupons": return <SafeRender name="Coupons"><CouponsPage /></SafeRender>;
      case "marketing-calendar": {
        const lock = checkLock("marketing-calendar", "Marketing Calendar");
        if (lock) return lock;
        return <SafeRender name="Marketing Calendar"><MarketingCalendarPage /></SafeRender>;
      }

      // ── OPERATIONS ──
      case "returns": return <SafeRender name="Returns"><ReturnsPage /></SafeRender>;
      case "sla-engine": {
        const lock = checkLock("sla-engine", "SLA Engine");
        if (lock) return lock;
        return <SafeRender name="SLA Engine"><SLAEnginePage /></SafeRender>;
      }
      case "support-tickets": {
        const lock = checkLock("support-tickets", "Support Tickets");
        if (lock) return lock;
        return <SafeRender name="Support Tickets"><TicketsPage /></SafeRender>;
      }
      case "packaging": return <SafeRender name="Packaging"><PackagingPage /></SafeRender>;
      case "shipping": return <SafeRender name="Shipping"><ShippingPage /></SafeRender>;
      case "suppliers": return <SafeRender name="Suppliers"><SuppliersPage /></SafeRender>;
      case "warehouse": {
        const lock = checkLock("warehouse", "Warehouse Management");
        if (lock) return lock;
        return <SafeRender name="Warehouse"><WarehousePage /></SafeRender>;
      }
      case "product-reviews": return <SafeRender name="Reviews"><ReviewsPage /></SafeRender>;
      case "team-management": case "team-members": return <SafeRender name="Team"><TeamPage /></SafeRender>;
      case "team-chat": return <SafeRender name="Team Chat"><TeamChatPage /></SafeRender>;
      case "support-chat": return <SafeRender name="Support Chat"><SupportChatPage /></SafeRender>;
      case "attendance": return <SafeRender name="Attendance"><AttendancePage /></SafeRender>;
      case "payroll": return <SafeRender name="Payroll"><PayrollPage /></SafeRender>;

      // ── CONNECTIONS ──
      case "integrations": {
        const lock = checkLock("integrations", "Custom Integrations");
        if (lock) return lock;
        return <SafeRender name="Integrations"><IntegrationsPage /></SafeRender>;
      }
      case "wa-business": case "whatsapp-integration": {
        const lock = checkLock("wa-business", "WA Business API");
        if (lock) return lock;
        return <SafeRender name="WhatsApp Integration"><WhatsAppIntegrationPage /></SafeRender>;
      }
      case "ai-tools": case "ai-assistant": {
        const lock = checkLock("ai-tools", "AI Tools");
        if (lock) return lock;
        return <SafeRender name="AI Tools"><AIAssistantPage /></SafeRender>;
      }
      case "whatsapp-messages": return <SafeRender name="WhatsApp"><WhatsAppPage /></SafeRender>;
      case "import-export": {
        const lock = checkLock("import-export", "Import/Export");
        if (lock) return lock;
        return <SafeRender name="Import/Export"><ImportExportPage /></SafeRender>;
      }

      // ── GUIDE (always available, no SafeRender — direct render for reliability) ──
      case "user-guide": return <UserGuidePage />;

      // ── SYSTEM ──
      case "subscriptions": return <SafeRender name="Subscriptions"><SubscriptionPage /></SafeRender>;
      case "brand-settings": return <SafeRender name="Settings"><SettingsPage /></SafeRender>;
      case "user-management": return <SafeRender name="User Management"><UserManagementPage /></SafeRender>;
      case "admin-dashboard": return <SafeRender name="Admin Dashboard"><AdminDashboard /></SafeRender>;
      case "payment-approvals": return <SafeRender name="Payment Approvals"><PaymentApprovalsPage /></SafeRender>;
      case "invoice-management": return <SafeRender name="Invoice Management"><InvoiceManagementPage /></SafeRender>;
      case "subscription-management": return <SafeRender name="Subscription Management"><AdminSubscriptionsPage /></SafeRender>;
      case "audit-log": {
        const lock = checkLock("audit-log", "Audit Log");
        if (lock) return lock;
        return <SafeRender name="Audit Log"><AuditLogPage /></SafeRender>;
      }
      case "platform-settings": return <SafeRender name="Platform Settings"><PlatformSettingsPage /></SafeRender>;

      default: return <SafeRender name="Dashboard"><DashboardHome /></SafeRender>;
    }
  };

  return (
    <div className={cn("flex h-screen", themeBg)}>
      <DashboardErrorBoundary>
        <Sidebar />
        <div className={cn(
          "flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          // Desktop margin for sidebar
          sidebarCollapsed ? "lg:ml-[60px]" : "lg:ml-[260px]",
          // Mobile: no margin (sidebar overlays)
        )}>
          <Header />
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 lg:p-6">
            <DashboardErrorBoundary>
              {/* CSS page transition — replaces framer-motion AnimatePresence */}
              <div key={activeSection} className="animate-count-up">
                {renderPage()}
              </div>
            </DashboardErrorBoundary>
          </main>
        </div>
        <FloatingEventIcons />
      </DashboardErrorBoundary>
    </div>
  );
}
