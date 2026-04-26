// ============================================================================
// Lazy-Loaded Page Components
// ============================================================================
// All page components are loaded lazily using React.lazy() + Suspense
// to reduce initial bundle size and improve Time to Interactive (TTI).
// Only pages that are actively rendered will be loaded.
// ============================================================================

import { lazy, Suspense } from "react";

// ── Loading Fallback ──
function PageLoader({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 mb-4 rounded-xl bg-[#1a1a25] border border-[var(--brand-accent)]/20 animate-pulse">
          <svg className="w-5 h-5 text-[var(--brand-accent)] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-xs text-slate-500">Loading {name}...</p>
      </div>
    </div>
  );
}

/**
 * Helper to create a lazy-loaded page with Suspense fallback.
 * Handles both default exports AND named exports (e.g. `export function DashboardHome()`).
 *
 * React.lazy() requires { default: ComponentType }, but many Valtriox components
 * use named exports. This helper auto-detects and wraps named exports correctly.
 *
 * Usage: const DashboardHome = lazyPage(() => import("@/components/brandflow/dashboard/DashboardHome"), "Dashboard");
 */
export function lazyPage(factory: () => Promise<Record<string, any>>, name: string) {
  const LazyComponent = lazy(async () => {
    const module = await factory();
    // Prefer default export (standard React.lazy behavior)
    if (module.default && typeof module.default === 'function') {
      return module as { default: React.ComponentType<any> };
    }
    // Fallback: find the first named export that looks like a React component (PascalCase function)
    const namedExport = Object.keys(module).find(
      (key) => typeof module[key] === 'function' && /^[A-Z]/.test(key)
    );
    if (namedExport) {
      return { default: module[namedExport] } as { default: React.ComponentType<any> };
    }
    throw new Error(`Lazy import "${name}": no component export found in module`);
  });
  return function LazyPage(props: any) {
    return (
      <Suspense fallback={<PageLoader name={name} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// ── Lazy Page Components ──

// ── MAIN ──
export const DashboardHome = lazyPage(() => import("@/components/brandflow/dashboard/DashboardHome"), "Dashboard");
export const OrdersPage = lazyPage(() => import("@/components/brandflow/orders/OrdersPage"), "Orders");
export const ProductsPage = lazyPage(() => import("@/components/brandflow/products/ProductsPage"), "Products");
export const CustomersPage = lazyPage(() => import("@/components/brandflow/customers/CustomersPage"), "Customers");
export const TasksPage = lazyPage(() => import("@/components/brandflow/tasks/TasksPage"), "Tasks");
export const CalendarPage = lazyPage(() => import("@/components/brandflow/calendar/CalendarPage"), "Calendar");

// ── PRODUCTS ──
export const CatalogPage = lazyPage(() => import("@/components/brandflow/products/CatalogPage"), "Catalog");
export const ReviewsPage = lazyPage(() => import("@/components/brandflow/products/ReviewsPage"), "Reviews");
export const PricingRulesPage = lazyPage(() => import("@/components/brandflow/products/PricingRulesPage"), "Pricing Rules");
export const VariantsPage = lazyPage(() => import("@/components/brandflow/products/VariantsPage"), "Variants");

// ── ANALYTICS ──
export const SalesReportsPage = lazyPage(() => import("@/components/brandflow/reports/SalesReportsPage"), "Sales Reports");
export const CustomerReportsPage = lazyPage(() => import("@/components/brandflow/reports/CustomerReportsPage"), "Customer Reports");
export const ProductReportsPage = lazyPage(() => import("@/components/brandflow/reports/ProductReportsPage"), "Product Reports");
export const RevenueAnalyticsPage = lazyPage(() => import("@/components/brandflow/analytics/RevenueAnalyticsPage"), "Revenue Analytics");
export const TrafficAnalyticsPage = lazyPage(() => import("@/components/brandflow/analytics/TrafficAnalyticsPage"), "Traffic Analytics");

// ── MARKETING ──
export const BroadcastsPage = lazyPage(() => import("@/components/brandflow/marketing/BroadcastsPage"), "Campaigns");
export const LoyaltyPage = lazyPage(() => import("@/components/brandflow/customers/LoyaltyPage"), "Loyalty");
export const EventsPage = lazyPage(() => import("@/components/brandflow/events/EventsPage"), "Events");
export const ReferralPage = lazyPage(() => import("@/components/brandflow/marketing/ReferralPage"), "Referral");
export const CouponsPage = lazyPage(() => import("@/components/brandflow/coupons/CouponsPage"), "Coupons");
export const MarketingCalendarPage = lazyPage(() => import("@/components/brandflow/marketing/MarketingCalendarPage"), "Marketing Calendar");
export const SEOManagerPage = lazyPage(() => import("@/components/brandflow/marketing/SEOManagerPage"), "SEO");
export const SocialMediaPage = lazyPage(() => import("@/components/brandflow/marketing/SocialMediaPage"), "Social Media");
export const EmailMarketingPage = lazyPage(() => import("@/components/brandflow/marketing/EmailMarketingPage"), "Email Marketing");
export const AdManagerPage = lazyPage(() => import("@/components/brandflow/marketing/AdManagerPage"), "Ad Manager");
export const InfluencersPage = lazyPage(() => import("@/components/brandflow/marketing/InfluencersPage"), "Influencers");

// ── OPERATIONS ──
export const TeamPage = lazyPage(() => import("@/components/brandflow/team/TeamPage"), "Team");
export const AttendancePage = lazyPage(() => import("@/components/brandflow/team/AttendancePage"), "Attendance");
export const PayrollPage = lazyPage(() => import("@/components/brandflow/team/PayrollPage"), "Payroll");
export const WhatsAppPage = lazyPage(() => import("@/components/brandflow/customers/WhatsAppPage"), "WhatsApp");
export const ReturnsPage = lazyPage(() => import("@/components/brandflow/operations/ReturnsPage"), "Returns");
export const SLAEnginePage = lazyPage(() => import("@/components/brandflow/operations/SLAEnginePage"), "SLA");
export const TicketsPage = lazyPage(() => import("@/components/brandflow/operations/TicketsPage"), "Tickets");
export const PackagingPage = lazyPage(() => import("@/components/brandflow/operations/PackagingPage"), "Packaging");
export const ShippingPage = lazyPage(() => import("@/components/brandflow/operations/ShippingPage"), "Shipping");
export const SuppliersPage = lazyPage(() => import("@/components/brandflow/operations/SuppliersPage"), "Suppliers");
export const WarehousePage = lazyPage(() => import("@/components/brandflow/operations/WarehousePage"), "Warehouse");

// ── CONNECTIONS ──
export const AIAssistantPage = lazyPage(() => import("@/components/brandflow/tools/AIAssistantPage"), "AI Tools");
export const WhatsAppIntegrationPage = lazyPage(() => import("@/components/brandflow/tools/WhatsAppIntegrationPage"), "WhatsApp Integration");
export const ImportExportPage = lazyPage(() => import("@/components/brandflow/tools/ImportExportPage"), "Import/Export");
export const IntegrationsPage = lazyPage(() => import("@/components/brandflow/connections/IntegrationsPage"), "Integrations");

// ── CHAT ──
export const TeamChatPage = lazyPage(() => import("@/components/brandflow/chat/TeamChatPage"), "Team Chat");
export const SupportChatPage = lazyPage(() => import("@/components/brandflow/support-chat/SupportChatPage"), "Support Chat");

// ── GUIDE ──
export const UserGuidePage = lazyPage(() => import("@/components/brandflow/guide/UserGuidePage"), "User Guide");

// ── SYSTEM ──
export const SettingsPage = lazyPage(() => import("@/components/brandflow/settings/SettingsPage"), "Settings");
export const UserManagementPage = lazyPage(() => import("@/components/brandflow/settings/UserManagementPage"), "User Management");
export const AdminDashboard = lazyPage(() => import("@/components/brandflow/settings/AdminDashboard"), "Admin Dashboard");
export const AuditLogPage = lazyPage(() => import("@/components/brandflow/settings/AuditLogPage"), "Audit Log");
export const SubscriptionPage = lazyPage(() => import("@/components/brandflow/subscriptions/SubscriptionPage"), "Subscriptions");
export const PaymentApprovalsPage = lazyPage(() => import("@/components/brandflow/subscriptions/PaymentApprovalsPage"), "Payment Approvals");
export const AdminSubscriptionsPage = lazyPage(() => import("@/components/brandflow/subscriptions/AdminSubscriptionsPage"), "Subscription Management");
export const InvoiceManagementPage = lazyPage(() => import("@/components/brandflow/subscriptions/InvoiceManagementPage"), "Invoice Management");
export const PlatformSettingsPage = lazyPage(() => import("@/components/brandflow/settings/PlatformSettingsPage"), "Platform Settings");
export const ClientManagementPage = lazyPage(() => import("@/components/brandflow/settings/ClientManagementPage"), "Client Management");
export const IntegrationManagementPage = lazyPage(() => import("@/components/brandflow/settings/IntegrationManagementPage"), "Integration Management");
