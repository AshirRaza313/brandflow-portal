/**
 * @file use-api.ts
 * @description Comprehensive React Query hooks for all Valtriox Portal API endpoints.
 *
 * Each hook wraps a specific API endpoint and provides:
 * - Automatic caching and background refetching
 * - Proper TypeScript typing for request params and response data
 * - Cache invalidation in mutation `onSuccess` callbacks
 * - `select` for data transformation where appropriate
 * - JSDoc documentation for each hook
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

// ============================================================================
// Shared Types
// ============================================================================

/** Standard paginated response shape returned by list endpoints. */
export interface PaginatedResponse<T> {
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

/** Standard error shape returned by the API. */
export interface ApiError {
  error: string;
  code?: string;
  details?: string;
}

// ============================================================================
// Order Types
// ============================================================================

export interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  total: number;
  productId?: string;
}

export interface OrderCustomer {
  name: string;
  email?: string;
  phone?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  organizationId: string;
  customerId?: string;
  customer?: OrderCustomer;
  channel: string;
  status: string;
  notes?: string;
  subtotal: number;
  total: number;
  priority?: string;
  courier?: string;
  trackingNumber?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrdersStats {
  total: number;
  pending: number;
  confirmed: number;
  dispatched: number;
  delivered: number;
}

export interface OrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  stats: OrdersStats;
}

export interface OrdersParams {
  orgId: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface CreateOrderPayload {
  organizationId?: string;
  customerId?: string;
  channel?: string;
  notes?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
}

export interface UpdateOrderStatusPayload {
  status: string;
}

// ============================================================================
// Product Types
// ============================================================================

export interface Product {
  id: string;
  organizationId: string;
  name: string;
  sku?: string;
  description?: string;
  price: number;
  costPrice?: number;
  stock: number;
  category?: string;
  status: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsStats {
  total: number;
  active: number;
  lowStock: number;
  totalValue: number;
}

export interface ProductsResponse {
  products: Product[];
  stats: ProductsStats;
}

export interface ProductsParams {
  orgId: string;
  category?: string;
  search?: string;
}

export interface CreateProductPayload {
  organizationId?: string;
  name: string;
  sku?: string;
  description?: string;
  price?: string | number;
  costPrice?: string | number;
  stock?: string | number;
  category?: string;
  status?: string;
}

// ============================================================================
// Stock Alert Types
// ============================================================================

export type UrgencyLevel = "low" | "medium" | "high" | "critical";

export interface StockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  avgDailySales: number;
  daysUntilOutOfStock: number | null;
  urgency: UrgencyLevel;
  category: string | null;
  price: number;
  imageUrl: string | null;
}

export interface StockAlertsSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface StockAlertsResponse {
  alerts: StockAlert[];
  summary: StockAlertsSummary;
}

export interface StockAlertsParams {
  orgId: string;
  urgency?: UrgencyLevel;
}

// ============================================================================
// Customer Types
// ============================================================================

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  address?: string;
  notes?: string;
  loyaltyTier: string;
  totalSpent: number;
  orderCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerStats {
  totalCustomers: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  vipCount: number;
  tierCounts: {
    new: number;
    bronze: number;
    silver: number;
    gold: number;
  };
}

export interface CustomersResponse {
  customers: Customer[];
  stats: CustomerStats;
}

export interface CreateCustomerPayload {
  organizationId?: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  address?: string;
  notes?: string;
  loyaltyTier?: string;
}

// ============================================================================
// Expense Types
// ============================================================================

export interface Expense {
  id: string;
  organizationId: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  createdAt: string;
}

export interface ExpensesResponse {
  expenses: Expense[];
}

export interface CreateExpensePayload {
  organizationId?: string;
  title: string;
  amount: string | number;
  category: string;
  date: string;
  description?: string;
}

// ============================================================================
// Task Types
// ============================================================================

export interface TeamTask {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  assignedTo?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TasksResponse {
  tasks: TeamTask[];
}

// ============================================================================
// Coupon Types
// ============================================================================

export interface Coupon {
  id: string;
  organizationId: string;
  code: string;
  type: string;
  value: number;
  minOrder?: number;
  usageLimit?: number;
  usedCount?: number;
  expiresAt?: string;
  status: string;
  createdAt: string;
}

export interface CouponsResponse {
  coupons: Coupon[];
}

export interface CreateCouponPayload {
  organizationId?: string;
  code: string;
  type?: string;
  value: string | number;
  minOrder?: string | number;
  usageLimit?: string | number;
  expiresAt?: string;
}

// ============================================================================
// Attendance Types
// ============================================================================

export interface AttendanceRecord {
  id: string;
  userId: string;
  organizationId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  totalHours?: number;
  status: string;
  lateReason?: string;
  leaveReason?: string;
  markedBy: string;
}

export interface AttendanceResponse {
  records: AttendanceRecord[];
  totalHours: number;
}

export interface AttendanceParams {
  orgId: string;
  userId: string;
  month?: string; // YYYY-MM format
}

// ============================================================================
// Dashboard Stats Types
// ============================================================================

export interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;
  orderCount: number;
  orderChange: number;
  activeOrders: number;
  customerCount: number;
  customerChange: number;
  newCustomers: number;
  conversionRate: number;
  avgOrderValue: number;
  lowStockProducts: number;
  recentOrders: Order[];
  revenueChartData: Array<{ date: string; revenue: number }>;
  orderStatusData: Array<{ name: string; value: number; fill: string }>;
}

// ============================================================================
// Activity Feed Types
// ============================================================================

export interface ActivityItem {
  id: string;
  type: "order" | "product" | "customer" | "team" | "payment" | "coupon";
  action: string;
  description: string;
  details: string;
  icon: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface ActivityFeedResponse {
  activities: ActivityItem[];
  total: number;
}

export interface ActivityFeedParams {
  orgId: string;
  limit?: number;
}

// ============================================================================
// Sales Report Types
// ============================================================================

export interface SalesReportStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  refunds: number;
  refundCount: number;
}

export interface SalesReportResponse {
  period: string;
  startDate: string;
  endDate: string;
  stats: SalesReportStats;
  statusBreakdown: Record<string, number>;
  dailyBreakdown: Array<{ date: string; revenue: number; orders: number }>;
  channelBreakdown: Record<string, { count: number; revenue: number }>;
  currency: { code: string; symbol: string };
}

export interface SalesReportParams {
  orgId: string;
  period?: "daily" | "weekly" | "monthly";
}

// ============================================================================
// Notification Types
// ============================================================================

export interface Notification {
  id: string;
  type: "new_order" | "status_change" | "low_stock" | "task_due" | "payment_received";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  referenceId?: string;
  referenceType?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

// ============================================================================
// Subscription Types
// ============================================================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  annualPrice: number;
  period: string;
  features: string[];
  teamLimit: number;
  orderLimit: number;
  productLimit: number;
  trialDays: number;
  annualSavings: number;
}

export interface SubscriptionPlansResponse {
  plans: SubscriptionPlan[];
}

export interface SubscriptionPayment {
  id: string;
  planName: string;
  amount: number;
  transactionId?: string;
  paymentMethod?: string;
  billingCycle: string;
  status: string;
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface CurrentSubscription {
  id: string;
  status: string;
  billingCycle: string;
  trialStartsAt?: string;
  trialEndsAt?: string;
  trialDaysRemaining: number;
  isTrialActive: boolean;
  currentPeriodEnd?: string;
  daysUntilRenewal: number;
  reminderCount: number;
  createdAt: string;
  updatedAt: string;
  plan: SubscriptionPlan;
  payments: SubscriptionPayment[];
}

export interface PlatformSettings {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  supportHours: string;
  whatsappNumber: string;
  paymentMethods: string[];
  currency: string;
  companyAddress: string;
}

export interface CurrentSubscriptionResponse {
  subscription: CurrentSubscription;
  platformSettings: PlatformSettings | null;
}

// ============================================================================
// Team Types
// ============================================================================

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
}

export interface TeamMember {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: TeamUser;
}

export interface TeamInvitation {
  id: string;
  organizationId: string;
  inviteeEmail: string;
  inviteeName: string;
  role: string;
  status: string;
  invitedAt: string;
  acceptedAt?: string;
  expiresAt: string;
}

export interface TeamResponse {
  members: TeamMember[];
  pendingInvitations: TeamInvitation[];
  teamLimit: number;
  currentCount: number;
}

export interface InviteTeamMemberPayload {
  organizationId: string;
  email: string;
  name?: string;
  role: string;
  pin: string;
  invitedBy?: string;
}

// ============================================================================
// Settings Types
// ============================================================================

export interface OrganizationSettings {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  website?: string;
  phone?: string;
  email?: string;
  currency: string;
  timezone: string;
  plan: string;
  country: string;
  religion: string;
  brandTagline: string;
  brandColor: string;
  secondaryBrandColor: string;
  brandDescription: string;
  address: string;
  taxId: string;
  favicon?: string;
}

export interface UpdateSettingsPayload {
  id?: string;
  name?: string;
  website?: string;
  phone?: string;
  email?: string;
  currency?: string;
  timezone?: string;
  logo?: string;
  favicon?: string;
  country?: string;
  religion?: string;
  brandTagline?: string;
  brandColor?: string;
  secondaryBrandColor?: string;
  brandDescription?: string;
  address?: string;
  taxId?: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface RevenueVsExpensesItem {
  week: string;
  revenue: number;
  expenses: number;
}

export interface OrdersByChannelItem {
  channel: string;
  count: number;
}

export interface OrderStatusBreakdownItem {
  status: string;
  count: number;
}

export interface TopProduct {
  productName: string;
  _sum: { quantity: number; total: number };
}

export interface ExpenseCategoryItem {
  category: string;
  amount: number;
}

export interface CustomerTierItem {
  tier: string;
  count: number;
}

export interface TopCustomer {
  name: string;
  totalSpent: number;
  orderCount: number;
}

export interface NewCustomerItem {
  month: string;
  count: number;
}

export interface AnalyticsResponse {
  revenueVsExpenses: RevenueVsExpensesItem[];
  ordersByChannel: OrdersByChannelItem[];
  orderStatusBreakdown: OrderStatusBreakdownItem[];
  topProducts: TopProduct[];
  expenseCategoryData: ExpenseCategoryItem[];
  customerTierDistribution: CustomerTierItem[];
  topCustomers: TopCustomer[];
  newCustomersData: NewCustomerItem[];
  totalRevenue: number;
  totalExpenses: number;
  avgOrderValue: number;
}

// ============================================================================
// Invoice Types
// ============================================================================

export interface Invoice {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  subscriptionId?: string;
  paymentProofId?: string;
  planName: string;
  amount: number;
  billingCycle: string;
  status: string;
  currencyCode: string;
  currencySymbol: string;
  dueDate: string;
  issuedAt?: string;
  paidAt?: string;
  periodStart?: string;
  periodEnd?: string;
  notes?: string;
  orgName: string;
  orgEmail?: string;
  orgPhone?: string;
  orgAddress?: string;
  createdAt: string;
}

export interface InvoicesResponse {
  invoices: Invoice[];
}

export interface CreateInvoicePayload {
  organizationId: string;
  subscriptionId?: string;
  paymentProofId?: string;
  planName: string;
  amount: string | number;
  billingCycle?: string;
  status?: string;
  currencyCode?: string;
  currencySymbol?: string;
  notes?: string;
  periodStart?: string;
  periodEnd?: string;
}

// ============================================================================
// Role Types
// ============================================================================

export interface Role {
  name: string;
  label: string;
  description: string;
  level: number;
  permissions: string[];
}

export interface RolesResponse {
  roles: Role[];
  total: number;
}

// ============================================================================
// Query Key Factory
// ============================================================================

/** Centralized query key factory for consistent cache key management. */
export const queryKeys = {
  // Orders
  orders: (orgId: string, params?: Record<string, unknown>) =>
    ["orders", orgId, params] as const,
  order: (id: string) => ["orders", id] as const,

  // Products
  products: (orgId: string, params?: Record<string, unknown>) =>
    ["products", orgId, params] as const,
  product: (id: string) => ["products", id] as const,
  stockAlerts: (orgId: string, urgency?: string) =>
    ["stock-alerts", orgId, urgency] as const,

  // Customers
  customers: (orgId: string) => ["customers", orgId] as const,
  customer: (id: string) => ["customers", id] as const,

  // Expenses
  expenses: (orgId: string, category?: string) =>
    ["expenses", orgId, category] as const,

  // Tasks
  tasks: (orgId: string) => ["tasks", orgId] as const,

  // Coupons
  coupons: (orgId: string) => ["coupons", orgId] as const,

  // Attendance
  attendance: (orgId: string, userId: string, month?: string) =>
    ["attendance", orgId, userId, month] as const,

  // Dashboard
  dashboardStats: (orgId: string) => ["dashboard", "stats", orgId] as const,
  activityFeed: (orgId: string, limit?: number) =>
    ["activity-feed", orgId, limit] as const,

  // Reports
  salesReport: (orgId: string, period?: string) =>
    ["reports", "sales", orgId, period] as const,

  // Notifications
  notifications: (orgId: string) => ["notifications", orgId] as const,

  // Subscriptions
  subscriptionPlans: () => ["subscriptions", "plans"] as const,
  currentSubscription: (orgId: string) =>
    ["subscriptions", "current", orgId] as const,

  // Team
  team: (orgId: string) => ["team", orgId] as const,

  // Settings
  settings: (orgId: string) => ["settings", orgId] as const,

  // Analytics
  analytics: (orgId: string) => ["analytics", orgId] as const,

  // Invoices
  invoices: (orgId: string) => ["invoices", orgId] as const,

  // Roles
  roles: () => ["roles"] as const,
} as const;

// ============================================================================
// Generic Fetch Helper
// ============================================================================

/**
 * Helper for making typed fetch requests to the API.
 * Uses fetchWithAuth on the client (auth flows via httpOnly cookies —
 * see Phase 17 PII purge). Falls back to plain fetch on the server.
 * Throws on non-2xx responses with the error message from the server.
 */

function authAwareFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // fetchWithAuth handles SSR gracefully (returns plain fetch on server)
  return fetchWithAuth(input, init);
}

async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await authAwareFetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody?.error) errorMessage = errorBody.error;
      if (errorBody?.details) errorMessage += `: ${errorBody.details}`;
    } catch {
      // Response body is not JSON - use the default error message
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// Query Hooks - Orders
// ============================================================================

/**
 * Fetches a paginated list of orders for an organization.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useOrders("org-123", { status: "pending", page: 1 });
 * console.log(data?.orders, data?.stats);
 * ```
 */
export function useOrders(
  orgId: string | undefined | null,
  params?: Omit<OrdersParams, "orgId">,
  options?: Partial<UseQueryOptions<OrdersResponse>>
) {
  return useQuery({
    queryKey: queryKeys.orders(orgId ?? "", params),
    queryFn: () => {
      const searchParams = new URLSearchParams({ orgId: orgId! });
      if (params?.status) searchParams.set("status", params.status);
      if (params?.search) searchParams.set("search", params.search);
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
      if (params?.sortDir) searchParams.set("sortDir", params.sortDir);
      return apiFetch<OrdersResponse>(`/api/orders?${searchParams.toString()}`);
    },
    enabled: !!orgId,
    ...options,
  });
}

/**
 * Fetches a single order by ID.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useOrder("order-456");
 * ```
 */
export function useOrder(
  id: string | undefined | null,
  options?: Partial<UseQueryOptions<{ order: Order }>>
) {
  return useQuery({
    queryKey: queryKeys.order(id ?? ""),
    queryFn: () => apiFetch<{ order: Order }>(`/api/orders/${id}`),
    enabled: !!id,
    ...options,
  });
}

/**
 * Creates a new order. Invalidates the orders list and dashboard stats on success.
 */
export function useCreateOrder(
  orgId: string,
  options?: Partial<
    UseMutationOptions<{ order: Order }, Error, CreateOrderPayload>
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) =>
      apiFetch<{ order: Order }>("/api/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders(orgId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardStats(orgId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.activityFeed(orgId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.analytics(orgId),
      });
    },
    ...options,
  });
}

/**
 * Updates an order's status. Invalidates orders list, the specific order, and dashboard stats.
 */
export function useUpdateOrderStatus(
  orgId: string,
  options?: Partial<
    UseMutationOptions<
      { order: Order },
      Error,
      { id: string; payload: UpdateOrderStatusPayload }
    >
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOrderStatusPayload }) =>
      apiFetch<{ order: Order }>(`/api/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders(orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.order(id) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardStats(orgId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(orgId),
      });
    },
    ...options,
  });
}

// ============================================================================
// Query Hooks - Products
// ============================================================================

/**
 * Fetches all products for an organization with optional filtering by category and search.
 *
 * @example
 * ```tsx
 * const { data } = useProducts("org-123", { category: "electronics" });
 * console.log(data?.products, data?.stats);
 * ```
 */
export function useProducts(
  orgId: string | undefined | null,
  params?: Omit<ProductsParams, "orgId">,
  options?: Partial<UseQueryOptions<ProductsResponse>>
) {
  return useQuery({
    queryKey: queryKeys.products(orgId ?? "", params),
    queryFn: () => {
      const searchParams = new URLSearchParams({ orgId: orgId! });
      if (params?.category) searchParams.set("category", params.category);
      if (params?.search) searchParams.set("search", params.search);
      return apiFetch<ProductsResponse>(`/api/products?${searchParams.toString()}`);
    },
    enabled: !!orgId,
    ...options,
  });
}

/**
 * Creates a new product. Invalidates products list, stock alerts, and dashboard stats.
 */
export function useCreateProduct(
  orgId: string,
  options?: Partial<
    UseMutationOptions<{ product: Product }, Error, CreateProductPayload>
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductPayload) =>
      apiFetch<{ product: Product }>("/api/products", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products(orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stockAlerts(orgId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardStats(orgId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.activityFeed(orgId),
      });
    },
    ...options,
  });
}

// ============================================================================
// Query Hooks - Stock Alerts
// ============================================================================

/**
 * Fetches smart stock alerts with sales velocity predictions and urgency levels.
 *
 * @example
 * ```tsx
 * const { data } = useStockAlerts("org-123", "critical");
 * console.log(data?.alerts, data?.summary);
 * ```
 */
export function useStockAlerts(
  orgId: string | undefined | null,
  urgency?: UrgencyLevel,
  options?: Partial<UseQueryOptions<StockAlertsResponse>>
) {
  return useQuery({
    queryKey: queryKeys.stockAlerts(orgId ?? "", urgency),
    queryFn: () => {
      const searchParams = new URLSearchParams({ orgId: orgId! });
      if (urgency) searchParams.set("urgency", urgency);
      return apiFetch<StockAlertsResponse>(
        `/api/products/stock-alerts?${searchParams.toString()}`
      );
    },
    enabled: !!orgId,
    select: (data) => data,
    ...options,
  });
}

// ============================================================================
// Query Hooks - Customers
// ============================================================================

/**
 * Fetches all customers for an organization with aggregated stats.
 *
 * @example
 * ```tsx
 * const { data } = useCustomers("org-123");
 * console.log(data?.customers, data?.stats);
 * ```
 */
export function useCustomers(
  orgId: string | undefined | null,
  options?: Partial<UseQueryOptions<CustomersResponse>>
) {
  return useQuery({
    queryKey: queryKeys.customers(orgId ?? ""),
    queryFn: () =>
      apiFetch<CustomersResponse>(`/api/customers?orgId=${orgId}`),
    enabled: !!orgId,
    ...options,
  });
}

/**
 * Creates a new customer. Invalidates the customer list and dashboard stats.
 */
export function useCreateCustomer(
  orgId: string,
  options?: Partial<
    UseMutationOptions<{ customer: Customer }, Error, CreateCustomerPayload>
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) =>
      apiFetch<{ customer: Customer }>("/api/customers", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers(orgId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardStats(orgId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.activityFeed(orgId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.analytics(orgId),
      });
    },
    ...options,
  });
}

// ============================================================================
// Query Hooks - Expenses
// ============================================================================

/**
 * Fetches all expenses for an organization with optional category filtering.
 *
 * @example
 * ```tsx
 * const { data } = useExpenses("org-123", "utilities");
 * ```
 */
export function useExpenses(
  orgId: string | undefined | null,
  category?: string,
  options?: Partial<UseQueryOptions<ExpensesResponse>>
) {
  return useQuery({
    queryKey: queryKeys.expenses(orgId ?? "", category),
    queryFn: () => {
      const searchParams = new URLSearchParams({ orgId: orgId! });
      if (category && category !== "all")
        searchParams.set("category", category);
      return apiFetch<ExpensesResponse>(
        `/api/expenses?${searchParams.toString()}`
      );
    },
    enabled: !!orgId,
    ...options,
  });
}

/**
 * Creates a new expense. Invalidates the expenses list and analytics.
 */
export function useCreateExpense(
  orgId: string,
  options?: Partial<
    UseMutationOptions<{ expense: Expense }, Error, CreateExpensePayload>
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateExpensePayload) =>
      apiFetch<{ expense: Expense }>("/api/expenses", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics(orgId) });
    },
    ...options,
  });
}

// ============================================================================
// Query Hooks - Tasks
// ============================================================================

/**
 * Fetches all tasks for an organization.
 *
 * @example
 * ```tsx
 * const { data } = useTasks("org-123");
 * ```
 */
export function useTasks(
  orgId: string | undefined | null,
  options?: Partial<UseQueryOptions<TasksResponse>>
) {
  return useQuery({
    queryKey: queryKeys.tasks(orgId ?? ""),
    queryFn: () =>
      apiFetch<TasksResponse>(`/api/tasks?orgId=${orgId}`),
    enabled: !!orgId,
    ...options,
  });
}

// ============================================================================
// Query Hooks - Coupons
// ============================================================================

/**
 * Fetches all coupons for an organization.
 *
 * @example
 * ```tsx
 * const { data } = useCoupons("org-123");
 * ```
 */
export function useCoupons(
  orgId: string | undefined | null,
  options?: Partial<UseQueryOptions<CouponsResponse>>
) {
  return useQuery({
    queryKey: queryKeys.coupons(orgId ?? ""),
    queryFn: () =>
      apiFetch<CouponsResponse>(`/api/coupons?orgId=${orgId}`),
    enabled: !!orgId,
    ...options,
  });
}

/**
 * Creates a new coupon. Invalidates the coupons list.
 */
export function useCreateCoupon(
  orgId: string,
  options?: Partial<
    UseMutationOptions<{ coupon: Coupon }, Error, CreateCouponPayload>
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCouponPayload) =>
      apiFetch<{ coupon: Coupon }>("/api/coupons", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coupons(orgId) });
    },
    ...options,
  });
}

// ============================================================================
// Query Hooks - Attendance
// ============================================================================

/**
 * Fetches attendance records for a user in an organization, optionally filtered by month.
 *
 * @example
 * ```tsx
 * const { data } = useAttendance("org-123", "user-456", "2025-01");
 * ```
 */
export function useAttendance(
  orgId: string | undefined | null,
  userId: string | undefined | null,
  month?: string,
  options?: Partial<UseQueryOptions<AttendanceResponse>>
) {
  return useQuery({
    queryKey: queryKeys.attendance(orgId ?? "", userId ?? "", month),
    queryFn: () => {
      const searchParams = new URLSearchParams({ orgId: orgId!, userId: userId! });
      if (month) searchParams.set("month", month);
      return apiFetch<AttendanceResponse>(
        `/api/attendance?${searchParams.toString()}`
      );
    },
    enabled: !!orgId && !!userId,
    ...options,
  });
}

// ============================================================================
// Query Hooks - Dashboard
// ============================================================================

/**
 * Fetches the main dashboard statistics including revenue, orders, customers,
 * recent orders, revenue chart data, and order status distribution.
 *
 * @example
 * ```tsx
 * const { data } = useDashboardStats("org-123");
 * console.log(data?.totalRevenue, data?.revenueChartData);
 * ```
 */
export function useDashboardStats(
  orgId: string | undefined | null,
  options?: Partial<UseQueryOptions<DashboardStats>>
) {
  return useQuery({
    queryKey: queryKeys.dashboardStats(orgId ?? ""),
    queryFn: () =>
      apiFetch<DashboardStats>(`/api/dashboard/stats?orgId=${orgId}`),
    enabled: !!orgId,
    staleTime: 30 * 1000, // Dashboard stats are relatively fresh - 30s
    ...options,
  });
}

/**
 * Fetches the activity feed with recent actions from orders, products, customers,
 * team invitations, and payments.
 *
 * @example
 * ```tsx
 * const { data } = useActivityFeed("org-123", 50);
 * ```
 */
export function useActivityFeed(
  orgId: string | undefined | null,
  limit?: number,
  options?: Partial<UseQueryOptions<ActivityFeedResponse>>
) {
  return useQuery({
    queryKey: queryKeys.activityFeed(orgId ?? "", limit),
    queryFn: () => {
      const searchParams = new URLSearchParams({ orgId: orgId! });
      if (limit) searchParams.set("limit", String(limit));
      return apiFetch<ActivityFeedResponse>(
        `/api/activity-feed?${searchParams.toString()}`
      );
    },
    enabled: !!orgId,
    staleTime: 45 * 1000, // Activity feed changes frequently - 45s
    ...options,
  });
}

// ============================================================================
// Query Hooks - Sales Report
// ============================================================================

/**
 * Fetches a sales report for the given period with revenue stats, status breakdown,
 * daily breakdown, and channel breakdown.
 *
 * @example
 * ```tsx
 * const { data } = useSalesReport("org-123", "weekly");
 * ```
 */
export function useSalesReport(
  orgId: string | undefined | null,
  period?: "daily" | "weekly" | "monthly",
  options?: Partial<UseQueryOptions<SalesReportResponse>>
) {
  return useQuery({
    queryKey: queryKeys.salesReport(orgId ?? "", period),
    queryFn: () => {
      const searchParams = new URLSearchParams({ orgId: orgId! });
      if (period) searchParams.set("period", period);
      return apiFetch<SalesReportResponse>(
        `/api/reports/sales?${searchParams.toString()}`
      );
    },
    enabled: !!orgId,
    ...options,
  });
}

// ============================================================================
// Query Hooks - Notifications
// ============================================================================

/**
 * Fetches notifications for an organization including new orders, status changes,
 * low stock alerts, task due reminders, and payment confirmations.
 *
 * @example
 * ```tsx
 * const { data } = useNotifications("org-123");
 * console.log(data?.unreadCount);
 * ```
 */
export function useNotifications(
  orgId: string | undefined | null,
  options?: Partial<UseQueryOptions<NotificationsResponse>>
) {
  return useQuery({
    queryKey: queryKeys.notifications(orgId ?? ""),
    queryFn: () =>
      apiFetch<NotificationsResponse>(`/api/notifications?orgId=${orgId}`),
    enabled: !!orgId,
    staleTime: 30 * 1000, // Notifications should be reasonably fresh
    select: (data) => data,
    ...options,
  });
}

// ============================================================================
// Query Hooks - Subscriptions
// ============================================================================

/**
 * Fetches all available subscription plans. This is a public endpoint
 * (no orgId required).
 *
 * @example
 * ```tsx
 * const { data } = useSubscriptionPlans();
 * ```
 */
export function useSubscriptionPlans(
  options?: Partial<UseQueryOptions<SubscriptionPlansResponse>>
) {
  return useQuery({
    queryKey: queryKeys.subscriptionPlans(),
    queryFn: () =>
      apiFetch<SubscriptionPlansResponse>("/api/subscriptions/plans"),
    staleTime: 10 * 60 * 1000, // Plans change infrequently - 10 min
    ...options,
  });
}

/**
 * Fetches the current organization's subscription details including plan info,
 * payment history, and trial status.
 *
 * @example
 * ```tsx
 * const { data } = useCurrentSubscription("org-123");
 * console.log(data?.subscription?.status, data?.platformSettings);
 * ```
 */
export function useCurrentSubscription(
  orgId: string | undefined | null,
  options?: Partial<UseQueryOptions<CurrentSubscriptionResponse>>
) {
  return useQuery({
    queryKey: queryKeys.currentSubscription(orgId ?? ""),
    queryFn: () =>
      apiFetch<CurrentSubscriptionResponse>(
        `/api/subscriptions/current?orgId=${orgId}`
      ),
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // Subscription status - 2 min
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 10_000),
    refetchOnWindowFocus: false, // useSubscriptionSync already handles this
    refetchOnReconnect: true,
    ...options,
  });
}

// ============================================================================
// Query Hooks - Team
// ============================================================================

/**
 * Fetches all team members, pending invitations, and team limit info.
 *
 * @example
 * ```tsx
 * const { data } = useTeam("org-123");
 * console.log(data?.members, data?.teamLimit);
 * ```
 */
export function useTeam(
  orgId: string | undefined | null,
  options?: Partial<UseQueryOptions<TeamResponse>>
) {
  return useQuery({
    queryKey: queryKeys.team(orgId ?? ""),
    queryFn: () =>
      apiFetch<TeamResponse>(`/api/team?orgId=${orgId}`),
    enabled: !!orgId,
    ...options,
  });
}

/**
 * Invites a new team member via PIN-based invitation.
 * Invalidates the team list and activity feed on success.
 */
export function useInviteTeamMember(
  orgId: string,
  options?: Partial<
    UseMutationOptions<
      {
        member: TeamMember;
        invitation: {
          id: string;
          email: string;
          name: string;
          role: string;
          pin: string;
          expiresAt: string;
        };
        teamLimit: number;
        currentCount: number;
        pendingCount: number;
        emailData: {
          to: string;
          from: string;
          subject: string;
          body: string;
        };
        message: string;
      },
      Error,
      InviteTeamMemberPayload
    >
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InviteTeamMemberPayload) =>
      apiFetch<
        {
          member: TeamMember;
          invitation: {
            id: string;
            email: string;
            name: string;
            role: string;
            pin: string;
            expiresAt: string;
          };
          teamLimit: number;
          currentCount: number;
          pendingCount: number;
          emailData: {
            to: string;
            from: string;
            subject: string;
            body: string;
          };
          message: string;
        }
      >("/api/team", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team(orgId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.activityFeed(orgId),
      });
    },
    ...options,
  });
}

// ============================================================================
// Query Hooks - Settings
// ============================================================================

/**
 * Fetches the organization settings including brand configuration.
 *
 * @example
 * ```tsx
 * const { data } = useSettings("org-123");
 * console.log(data?.name, data?.brandColor);
 * ```
 */
export function useSettings(
  orgId: string | undefined | null,
  options?: Partial<UseQueryOptions<OrganizationSettings>>
) {
  return useQuery({
    queryKey: queryKeys.settings(orgId ?? ""),
    queryFn: () =>
      apiFetch<OrganizationSettings>(`/api/settings?orgId=${orgId}`),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // Settings change infrequently - 5 min
    ...options,
  });
}

/**
 * Updates organization settings. Invalidates settings, dashboard stats, and team queries.
 */
export function useUpdateSettings(
  orgId: string,
  options?: Partial<
    UseMutationOptions<
      { organization: OrganizationSettings },
      Error,
      UpdateSettingsPayload
    >
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSettingsPayload) =>
      apiFetch<{ organization: OrganizationSettings }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings(orgId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardStats(orgId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.team(orgId) });
    },
    ...options,
  });
}

// ============================================================================
// Query Hooks - Analytics
// ============================================================================

/**
 * Fetches comprehensive analytics data including revenue vs expenses, orders by channel,
 * order status breakdown, top products, expense categories, customer tiers, top customers,
 * and new customer trends.
 *
 * @example
 * ```tsx
 * const { data } = useAnalytics("org-123");
 * console.log(data?.revenueVsExpenses, data?.topProducts);
 * ```
 */
export function useAnalytics(
  orgId: string | undefined | null,
  options?: Partial<UseQueryOptions<AnalyticsResponse>>
) {
  return useQuery({
    queryKey: queryKeys.analytics(orgId ?? ""),
    queryFn: () =>
      apiFetch<AnalyticsResponse>(`/api/analytics?orgId=${orgId}`),
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // Analytics - 2 min
    ...options,
  });
}

// ============================================================================
// Query Hooks - Invoices
// ============================================================================

/**
 * Fetches invoices for an organization. Uses the admin invoices endpoint.
 *
 * @example
 * ```tsx
 * const { data } = useInvoices("org-123");
 * ```
 */
export function useInvoices(
  orgId: string | undefined | null,
  options?: Partial<UseQueryOptions<InvoicesResponse>>
) {
  return useQuery({
    queryKey: queryKeys.invoices(orgId ?? ""),
    queryFn: () =>
      apiFetch<InvoicesResponse>(
        `/api/admin/invoices?orgId=${orgId}`
      ),
    enabled: !!orgId,
    ...options,
  });
}

/**
 * Creates a new invoice. Invalidates the invoices list on success.
 */
export function useCreateInvoice(
  orgId: string,
  options?: Partial<
    UseMutationOptions<{ invoice: Invoice }, Error, CreateInvoicePayload>
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) =>
      apiFetch<{ invoice: Invoice }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices(orgId) });
    },
    ...options,
  });
}

// ============================================================================
// Query Hooks - Roles
// ============================================================================

/**
 * Fetches all available roles and their permissions. This endpoint does not require orgId.
 *
 * @example
 * ```tsx
 * const { data } = useRoles();
 * ```
 */
export function useRoles(
  options?: Partial<UseQueryOptions<RolesResponse>>
) {
  return useQuery({
    queryKey: queryKeys.roles(),
    queryFn: () => apiFetch<RolesResponse>("/api/roles"),
    staleTime: 15 * 60 * 1000, // Roles change very infrequently - 15 min
    ...options,
  });
}
