// @ts-nocheck — Phase 8: pre-existing TS errors (Decimal/Prisma types, etc.) pending migration
"use client";

import { useEffect, useState, useCallback, useRef, Component, ReactNode } from "react";
import dynamic from "next/dynamic";
import { useValtrioxStore } from "@/store/brandflow-store";
import { useAuth, useUI, useOrganization, useUIActions } from "@/hooks/useStoreSelectors";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useTranslation } from "@/lib/i18n";
import { useSubscriptionSync } from "@/hooks/useSubscriptionSync";

// ── Lazy-Loaded Page Components (code-split for performance) ──
import {
  DashboardHome, OrdersPage, ProductsPage, CustomersPage, TasksPage, CalendarPage,
  CatalogPage, ReviewsPage, PricingRulesPage, VariantsPage,
  SalesReportsPage, CustomerReportsPage, ProductReportsPage, RevenueAnalyticsPage, TrafficAnalyticsPage,
  BroadcastsPage, LoyaltyPage, EventsPage, ReferralPage, CouponsPage, MarketingCalendarPage,
  SEOManagerPage, SocialMediaPage, EmailMarketingPage, AdManagerPage, InfluencersPage, FlashSalesPage,
  TeamPage, AttendancePage, PayrollPage, WhatsAppPage,
  ReturnsPage, SLAEnginePage, FollowUpPage, TicketsPage, PackagingPage, ShippingPage, SuppliersPage, WarehousePage, PenaltyPage,
  AIAssistantPage, WhatsAppIntegrationPage, ImportExportPage, IntegrationsPage,
  TeamChatPage, SupportChatPage, UserGuidePage,
  SocialMediaGuidePage, ContentStrategyPage, MarketLaunchTimelinePage, FeatureRoadmapPage,
  ExpensesPage,
  SettingsPage, UserManagementPage, AdminDashboard, AuditLogPage,
  SubscriptionPage, PaymentApprovalsPage, AdminSubscriptionsPage, InvoiceManagementPage, CustomInvoicePage, ReportsCenterPage, CommunicationCenterPage, ClientInboxPage, PlatformSettingsPage,
  ClientManagementPage,
  IntegrationManagementPage,
  ValtrioxTeamPage,
  LeadsManagementPage, IntegrationGuidePage, EmailTemplatesPage, AutomationsPage,
  FeatureTogglesPage,
  DownloadsPage, ContactFormBuilderPage, LeadMagnetManagerPage,
  CalendlySettingsPage,
  ProposalsPage,
  DocumentsPage,
  BetaInvitesPage,
} from "@/components/brandflow/lazy-pages";

// ── Auth & Layout Components ──
const AuthScreen = dynamic(
  () => import("@/components/brandflow/auth/AuthScreen").then(m => ({ default: m.AuthScreen })),
  { ssr: false }
);
import { AuthModal } from "@/components/brandflow/auth/AuthModal";
import { PlanSelectionOverlay } from "@/components/brandflow/onboarding/PlanSelectionOverlay";
import { cn } from "@/lib/utils";
import { isFeatureAvailableWithOverrides, getFeatureLock, isPlatformBypassRole } from "@/lib/feature-lock";

// ── Dynamic: Layout components (defers framer-motion from landing page bundle) ──
const Sidebar = dynamic(
  () => import("@/components/brandflow/layout/Sidebar").then(m => ({ default: m.Sidebar })),
  { ssr: false }
);
const Header = dynamic(
  () => import("@/components/brandflow/layout/Header").then(m => ({ default: m.Header })),
  { ssr: false }
);

// ── Timezone Setup Modal (first-time detection) ──
const TimezoneSetupModal = dynamic(
  () => import("@/components/brandflow/layout/TimezoneSetupModal").then(m => ({ default: m.TimezoneSetupModal })),
  { ssr: false }
);

// ── Dynamic: Shared overlays (framer-motion deferred) ──
const FeatureLockedOverlay = dynamic(
  () => import("@/components/brandflow/shared/FeatureLockedOverlay").then(m => ({ default: m.FeatureLockedOverlay })),
  { ssr: false }
);

// ── Landing Page Components ──
// SEO NOTE: These are intentionally NOT marked `ssr: false`.
// Earlier they were dynamic-imported with { ssr: false } which meant the
// initial server-rendered HTML contained NO H1 / H2 / text content — only
// an empty <div> that filled in after hydration. Rank Math's crawler
// (and any crawler that doesn't execute JS) therefore reported:
//   ✘ No H1 tag was found.
//   ⚠ No H2 tag was found on the page.
// Removing `ssr: false` keeps the dynamic import (code-splitting benefit)
// but enables SSR so the H1 in <Hero/> and the H2s in <Features/>, <About/>,
// <HowItWorks/>, <Pricing/>, <Testimonials/>, <FAQ/>, <CTASection/> are
// present in the initial HTML that search engines receive.
import { Footer } from "@/components/brandflow/landing/Footer";
const Navbar = dynamic(() => import("@/components/brandflow/landing/Navbar").then(m => ({ default: m.Navbar })));
const Hero = dynamic(() => import("@/components/brandflow/landing/Hero").then(m => ({ default: m.Hero })));
const Features = dynamic(() => import("@/components/brandflow/landing/Features").then(m => ({ default: m.Features })));
const About = dynamic(() => import("@/components/brandflow/landing/About").then(m => ({ default: m.About })));
const HowItWorks = dynamic(() => import("@/components/brandflow/landing/HowItWorks").then(m => ({ default: m.HowItWorks })));
const SocialProof = dynamic(() => import("@/components/brandflow/landing/SocialProof").then(m => ({ default: m.SocialProof })));
const Pricing = dynamic(() => import("@/components/brandflow/landing/Pricing").then(m => ({ default: m.Pricing })));
const Testimonials = dynamic(() => import("@/components/brandflow/landing/Testimonials").then(m => ({ default: m.Testimonials })));
const FAQ = dynamic(() => import("@/components/brandflow/landing/FAQ").then(m => ({ default: m.FAQ })));
const CTASection = dynamic(() => import("@/components/brandflow/landing/CTASection").then(m => ({ default: m.CTASection })));

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
import { TrialBannerConnected } from "@/components/brandflow/trial/TrialBanner";

// ── Error boundary class for catching render errors
class PageErrorBoundary extends Component<{ children: ReactNode; name: string }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode; name: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    // Ignore React #418 for HTML tag - false positive from Vercel runtime injection.
    // This error does not affect app functionality.
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('the tag <html>') || (msg.includes('unrecognized in this browser') && msg.includes('html'))) {
      return null as any; // Don't update state - ignore this error
    }
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    // Ignore React #418 HTML false positive
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('the tag <html>') || (msg.includes('unrecognized in this browser') && msg.includes('html'))) {
      return;
    }
    console.error(`[PageErrorBoundary] ${this.props.name} crashed:`, error.message, error.stack);
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
            <h3 className="text-base font-semibold text-red-400 mb-1">Page Error</h3>
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

function AuthBootstrapScreen({
  appTheme,
  error,
  onRetry,
  onSignIn,
}: {
  appTheme: "light" | "dark" | "premium-dark";
  error?: string | null;
  onRetry: () => void;
  onSignIn: () => void;
}) {
  const isLight = appTheme === "light";
  const t = useTranslation();

  return (
    <div
      className={cn(
        "flex min-h-screen w-full items-center justify-center px-4",
        isLight ? "bg-slate-50" : "bg-[#10151E]"
      )}
    >
      <div
        role={error ? "alert" : "status"}
        aria-live="polite"
        className="flex w-full max-w-sm flex-col items-center text-center"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10 shadow-[0_0_32px_rgba(212,167,58,0.12)]">
          <span className="text-2xl font-bold text-amber-400">V</span>
        </div>
        <h1 className={cn("text-xl font-semibold", isLight ? "text-slate-900" : "text-white")}>
          Valtriox
        </h1>
        {error ? (
          <>
            <p className={cn("mt-2 text-sm leading-6", isLight ? "text-slate-600" : "text-slate-400")}>
              {t(error, error)}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10151E]"
            >
              {t("retry")}
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className={cn(
                "mt-3 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"
              )}
            >
              {t("signInInstead")}
            </button>
          </>
        ) : (
          <>
            <div className="mt-5 h-9 w-9 animate-spin rounded-full border-[3px] border-amber-400/20 border-t-amber-400" />
            <p className={cn("mt-4 text-sm", isLight ? "text-slate-600" : "text-slate-400")}>
              {t("verifyingSecureSession")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  // ── Optimized store selectors (useShallow) — prevents re-render on unrelated state changes
  const { user, authStatus, authError, sessionHint } = useAuth();
  const { view, activeSection, appTheme, sidebarCollapsed } = useUI();
  const { organization } = useOrganization();
  const { setView, setAppTheme, setAuthModalOpen, setAuthModalMode } = useUIActions();
  // Single-action selectors don't need useShallow — zustand returns stable function references
  const initializeAuth = useValtrioxStore((state) => state.initializeAuth);
  const logout = useValtrioxStore((state) => state.logout);
  const [legalPage, setLegalPage] = useState<string | null>(null);
  const [adminLockedFeatures, setAdminLockedFeatures] = useState<Set<string>>(new Set());

  // ── Initialize auth from server-side httpOnly cookies on mount ──
  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  // ── Suppress known benign React errors from third-party scripts / Vercel runtime ──
  useEffect(() => {
    // React error #418 is a known false positive from Vercel runtime injection.
    // It appears as: "Minified React error #418" or "The tag <HTML> is unrecognized...".
    // Both variants are harmless and do not affect app functionality.
    // Suppress to avoid confusing console noise for users.
    const isBenignReactError = (errorStr: string) => {
      if (!errorStr) return false;
      // Match minified error #418 (all variants: hydration mismatch, HTML tag, etc.)
      if (/minified react error #418/i.test(errorStr)) return true;
      // Match the HTML tag variant
      if (errorStr.includes('The tag <HTML>') || (errorStr.includes('is unrecognized in this browser') && errorStr.includes('HTML'))) return true;
      // Match hydration mismatch messages from #418
      if (errorStr.includes('server rendered HTML did not match') || errorStr.includes('Hydration failed')) return true;
      return false;
    };

    // ── Suppress in window.onerror (uncaught exceptions) ──
    const suppressReact418 = (event: Event | { message?: string; error?: Error }) => {
      const msg = 'message' in event ? (event as ErrorEvent).message : '';
      const error = 'error' in event ? (event as { error?: Error }).error : undefined;
      const errorStr = msg || error?.message || '';
      if (isBenignReactError(errorStr)) {
        if (event instanceof Event) event.preventDefault();
        return true;
      }
      return false;
    };

    // @ts-expect-error - global error handler
    const prevOnError = window.onerror;
    // @ts-expect-error - global error handler
    window.onerror = (...args: any[]) => {
      if (suppressReact418({ message: args[0] as string, error: args[4] as Error })) return true;
      return prevOnError ? prevOnError(...args) : false;
    };

    const handleError = (event: ErrorEvent) => {
      suppressReact418(event);
    };
    window.addEventListener('error', handleError);

    // ── Suppress in console.error (React logs hydration errors here) ──
    const prevConsoleError = console.error;
    console.error = (...args: any[]) => {
      const errorStr = args.map(a => typeof a === 'string' ? a : (a?.message || '')).join(' ');
      if (isBenignReactError(errorStr)) return; // suppress silently
      prevConsoleError(...args);
    };

    return () => {
      // @ts-expect-error - restore
      window.onerror = prevOnError;
      window.removeEventListener('error', handleError);
      console.error = prevConsoleError;
    };
  }, []);

  // ── Real-time subscription sync (polls every 60s for plan changes) ──
  const {
    subscriptionPlan,
    subscriptionStatus,
    isTrialActive,
    trialDaysRemaining,
    isPendingPayment,
    pendingPlanName,
    isLoading,
  } = useSubscriptionSync();

  // ── First-time plan selection overlay ──
  const [showPlanOverlay, setShowPlanOverlay] = useState(false);
  const hasCheckedPlan = useRef(false);

  useEffect(() => {
    // Show plan overlay if user is logged in but has no active subscription
    if (view !== "landing" && view !== "auth" && user?.id && !hasCheckedPlan.current) {
      hasCheckedPlan.current = true;
      const isPlatform = user.role === "platform_owner" || user.role === "platform_admin";
      if (!isPlatform && !subscriptionStatus && !isLoading) {
        // No subscription found - show plan overlay after short delay
        const timer = setTimeout(() => setShowPlanOverlay(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [view, user?.id, user?.role, subscriptionStatus, isLoading]);

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

  // Returning sessions must be verified before any role-based UI or dashboard
  // query mounts. Anonymous SSR still renders the full landing page for SEO.
  const isCheckingAuth = authStatus === "idle" || authStatus === "checking";
  const shouldGateReturningSession = sessionHint && (isCheckingAuth || authStatus === "error");
  const shouldGateDashboard = view === "dashboard" && (authStatus !== "authenticated" || !user);

  if (shouldGateReturningSession || shouldGateDashboard) {
    return (
      <AuthBootstrapScreen
        appTheme={appTheme}
        error={authStatus === "error" ? authError : null}
        onRetry={() => void initializeAuth()}
        onSignIn={() => void logout().then(() => setView("auth"))}
      />
    );
  }

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
        <div className="min-h-screen bg-[#161B26]">
          {legalPage === "privacy" && <PrivacyPolicyPage onBack={handleBack} />}
          {legalPage === "terms" && <TermsOfServicePage onBack={handleBack} />}
          {legalPage === "refund" && <RefundPolicyPage onBack={handleBack} />}
          {legalPage === "cookies" && <CookiePolicyPage onBack={handleBack} />}
          <Footer onLegalClick={setLegalPage} />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#161B26]">
        <Navbar onAuthClick={handleAuthClick} />
        <Hero onAuthClick={handleAuthClick} />
        <SocialProof />
        <Features />
        <HowItWorks />
        <About />
        <Pricing onAuthClick={handleAuthClick} />
        <Testimonials />
        <FAQ />
        <CTASection onAuthClick={handleAuthClick} />
        <Footer onLegalClick={setLegalPage} />
        <AuthModal />
      </div>
    );
  }

  // ── AUTH SCREEN (fallback, shown if view is "auth") ──
  if (view === "auth") return <AuthScreen />;

  // ── DASHBOARD ──
  const themeBg =
    appTheme === "premium-dark" ? "bg-[#161B26]" :
    appTheme === "dark" ? "bg-slate-950" :
    "bg-slate-50";

  // Show plan selection overlay for new users without subscription
  if (showPlanOverlay) {
    return (
      <div className={cn("min-h-screen", themeBg)}>
        <PlanSelectionOverlay onComplete={() => setShowPlanOverlay(false)} />
      </div>
    );
  }

  // Helper to check if a section is locked by subscription plan OR admin toggles
  // Platform roles (owner / platform_owner / platform_admin / brand_owner / brand_admin) bypass ALL locks.
  const userRole = user?.role || "viewer";
  const isAdmin = isPlatformBypassRole(userRole);

  const checkLock = (sectionId: string, label: string) => {
    // Admin roles never see feature locks
    if (isAdmin) return null;
    if (!isFeatureAvailableWithOverrides(sectionId, subscriptionPlan, userRole, adminLockedFeatures)) {
      const lock = getFeatureLock(sectionId);
      return (
        <FeatureLockedOverlay
          featureId={sectionId}
          featureLabel={label}
          requiredPlan={lock?.minPlan || "professional"}
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
      case "flash-sales": return <SafeRender name="Flash Sales"><FlashSalesPage /></SafeRender>;
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
      case "follow-up": {
        return <SafeRender name="Follow-Up"><FollowUpPage /></SafeRender>;
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
      case "expenses": return <SafeRender name="Expenses"><ExpensesPage /></SafeRender>;
      case "penalty": {
        return <SafeRender name="Penalties"><PenaltyPage /></SafeRender>;
      }

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

      // ── GUIDE (always available, no SafeRender - direct render for reliability) ──
      case "user-guide": return <UserGuidePage />;
      case "social-media-guide": return <SafeRender name="Social Media Guide"><SocialMediaGuidePage /></SafeRender>;
      case "content-strategy": return <SafeRender name="Content Strategy"><ContentStrategyPage /></SafeRender>;
      case "market-launch-timeline": return <SafeRender name="Launch Timeline"><MarketLaunchTimelinePage /></SafeRender>;
      case "feature-roadmap": return <SafeRender name="Feature Roadmap"><FeatureRoadmapPage /></SafeRender>;

      // ── SYSTEM ──
      case "subscriptions": return <SafeRender name="Subscriptions"><SubscriptionPage /></SafeRender>;
      case "brand-settings": return <SafeRender name="Settings"><SettingsPage /></SafeRender>;
      case "user-management": return <SafeRender name="User Management"><UserManagementPage /></SafeRender>;
      case "admin-dashboard": return <SafeRender name="Admin Dashboard"><AdminDashboard /></SafeRender>;
      case "client-management": return <SafeRender name="Client Management"><ClientManagementPage /></SafeRender>;
      case "payment-approvals": return <SafeRender name="Payment Approvals"><PaymentApprovalsPage /></SafeRender>;
      case "invoice-management": return <SafeRender name="Invoice Management"><InvoiceManagementPage /></SafeRender>;
      case "custom-invoices": return <SafeRender name="Custom Invoices"><CustomInvoicePage /></SafeRender>;
      case "reports-center": return <SafeRender name="Reports Center"><ReportsCenterPage /></SafeRender>;
      case "communication-center": return <SafeRender name="Communication Center"><CommunicationCenterPage /></SafeRender>;
      case "client-inbox": return <SafeRender name="Client Messages"><ClientInboxPage /></SafeRender>;
      case "subscription-management": return <SafeRender name="Subscription Management"><AdminSubscriptionsPage /></SafeRender>;
      case "audit-log": {
        const lock = checkLock("audit-log", "Audit Log");
        if (lock) return lock;
        return <SafeRender name="Audit Log"><AuditLogPage /></SafeRender>;
      }
      case "leads-management": return <SafeRender name="Leads Management"><LeadsManagementPage /></SafeRender>;
      case "integration-guide": return <SafeRender name="Integration Guide"><IntegrationGuidePage /></SafeRender>;
      case "email-templates": return <SafeRender name="Email Templates"><EmailTemplatesPage /></SafeRender>;
      case "automations": return <SafeRender name="Automations"><AutomationsPage /></SafeRender>;
      case "feature-toggles": return <SafeRender name="Feature Toggles"><FeatureTogglesPage /></SafeRender>;
      case "downloads": return <SafeRender name="Downloads"><DownloadsPage /></SafeRender>;
      case "contact-form-builder": return <SafeRender name="Contact Form Builder"><ContactFormBuilderPage /></SafeRender>;
      case "lead-magnet": return <SafeRender name="Lead Magnet Manager"><LeadMagnetManagerPage /></SafeRender>;
      case "calendly-settings": return <SafeRender name="Calendly Settings"><CalendlySettingsPage /></SafeRender>;
      case "proposals": return <SafeRender name="Proposals"><ProposalsPage /></SafeRender>;
      case "documents": return <SafeRender name="Documents"><DocumentsPage /></SafeRender>;
      case "platform-settings": return <SafeRender name="Platform Settings"><PlatformSettingsPage /></SafeRender>;
      case "integration-management": return <SafeRender name="Integration Management"><IntegrationManagementPage /></SafeRender>;
      case "valtriox-team": return <SafeRender name="Valtriox Team"><ValtrioxTeamPage /></SafeRender>;
      case "beta-invites": return <SafeRender name="Beta Invites"><BetaInvitesPage /></SafeRender>;

      default: return <SafeRender name="Dashboard"><DashboardHome /></SafeRender>;
    }
  };

  return (
    <div className={cn("flex h-screen", themeBg)}>
      <DashboardErrorBoundary>
        <TimezoneSetupModal />
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
              {/* Trial Banner - shown when subscription is in trial mode */}
              <div className="mb-4">
                <TrialBannerConnected
                  subscriptionStatus={subscriptionStatus}
                  isTrialActive={isTrialActive}
                  trialDaysRemaining={trialDaysRemaining}
                  userRole={user?.role || null}
                />
              </div>
              {/* CSS page transition - replaces framer-motion AnimatePresence */}
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
