// @ts-nocheck — Phase 8: pre-existing TS errors (Decimal/Prisma types, etc.) pending migration
// ============================================================================
// Zod Validation Schemas for Valtriox API Routes
// ============================================================================
// Phase 3: Centralized input validation for all mutation endpoints.
// Each schema corresponds to an API domain and is used with withValidatedBody().
// ============================================================================

import { z } from "zod";
import { isCalendlyHttpsUrl } from "@/lib/calendly";

// ── Reusable primitives ──────────────────────────────────────────────────────

const nonEmptyString = z.string().min(1).max(1000);
const cuid = z.string().min(1).max(50);
const optionalString = z.string().max(2000).optional().or(z.literal(""));
const email = z.string().email().max(254);
const phone = z.string().max(30).regex(/^[0-9+\-()\s]*$/, "Invalid phone format");
const url = z.string().url().max(2048).optional().or(z.literal(""));
const price = z.number().min(0).max(99999999.99);
const positiveInt = z.number().int().min(0).max(2147483647);
const quantity = z.number().int().min(1).max(999999);
const slug = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Invalid slug format");
const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional();
const paginationPage = z.coerce.number().int().min(1).default(1);
const paginationLimit = z.coerce.number().int().min(1).max(100).default(10);

// ── Auth schemas ─────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: email,
  password: z.string().min(8).max(128),
  organizationName: z.string().min(2).max(100).optional(),
});

export const loginSchema = z.object({
  email: email,
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
  email: email,
});

export const resetPasswordSchema = z.object({
  email: email,
  otp: z.string().length(6),
  newPassword: z.string().min(8).max(128),
});

export const verifyOtpSchema = z.object({
  email: email,
  otp: z.string().length(6),
});

// ── Organization schemas ─────────────────────────────────────────────────────

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: phone.optional(),
  email: email.optional(),
  website: url,
  country: optionalString,
  religion: optionalString,
  brandTagline: z.string().max(200).optional(),
  brandColor: hexColor,
  secondaryBrandColor: hexColor,
  brandDescription: z.string().max(2000).optional(),
  industry: z.string().max(100).optional(),
  address: optionalString,
  currency: z.string().length(3).optional(),
  timezone: z.string().max(50).optional(),
  workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["owner", "brand_owner", "manager", "member", "support_agent", "sales_manager", "inventory_clerk", "warehouse_manager"]),
});

// ── Product schemas ──────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: optionalString,
  sku: z.string().max(50).optional(),
  price: price,
  costPrice: price.optional(),
  stock: positiveInt,
  category: z.string().max(100).optional(),
  status: z.enum(["active", "draft", "archived"]).default("active"),
  imageUrl: url,
});

export const updateProductSchema = createProductSchema.partial();

// ── Order schemas ────────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  productId: cuid,
  productName: z.string().min(1).max(200),
  quantity: quantity,
  price: price,
});

export const createOrderSchema = z.object({
  customerId: cuid.optional(),
  channel: z.enum(["manual", "whatsapp", "website", "instagram", "facebook", "phone"]).default("manual"),
  notes: optionalString,
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "packed", "dispatched", "delivered", "cancelled", "returned"]),
  note: optionalString,
});

export const updateOrderSchema = z.object({
  status: z.enum(["pending", "confirmed", "packed", "dispatched", "delivered", "cancelled", "returned"]).optional(),
  notes: optionalString,
  channel: z.enum(["manual", "whatsapp", "website", "instagram", "facebook", "phone"]).optional(),
}).refine(data => Object.keys(data).length > 0, { message: "At least one field must be provided" });

// ── Customer schemas ─────────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  email: email.optional(),
  phone: phone.optional(),
  address: optionalString,
  notes: optionalString,
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ── Expense schemas ──────────────────────────────────────────────────────────

export const createExpenseSchema = z.object({
  category: z.string().min(1).max(100),
  amount: price,
  description: optionalString,
  date: z.string().datetime().optional(),
  vendor: z.string().max(200).optional(),
});

// ── Coupon schemas ───────────────────────────────────────────────────────────

export const createCouponSchema = z.object({
  code: z.string().min(1).max(50),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().min(0).max(1000000),
  minOrderAmount: price.optional(),
  maxUses: positiveInt.optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const updateCouponSchema = createCouponSchema.partial();

// ── Invoice schemas ──────────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  customerId: cuid,
  orderId: cuid.optional(),
  dueDate: z.string().datetime().optional(),
  items: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: quantity,
    price: price,
  })).min(1),
  notes: optionalString,
});

// ── Team / Task schemas ──────────────────────────────────────────────────────

export const inviteTeamMemberSchema = z.object({
  email: email,
  role: z.enum(["owner", "brand_owner", "manager", "member", "support_agent", "sales_manager", "inventory_clerk", "warehouse_manager"]).default("member"),
  name: z.string().min(1).max(100).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: optionalString,
  assignedTo: z.string().max(100).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: optionalString,
  assignedTo: z.string().max(100).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
}).refine(data => Object.keys(data).length > 0, { message: "At least one field must be provided" });

// ── Broadcast schemas ────────────────────────────────────────────────────────

export const createBroadcastSchema = z.object({
  title: z.string().min(1).max(300),
  message: z.string().min(1).max(5000),
  channels: z.array(z.enum(["whatsapp", "email", "sms", "push"])).min(1),
  scheduledAt: z.string().datetime().optional(),
  segment: z.string().max(100).optional(),
});

// ── Feedback schemas ─────────────────────────────────────────────────────────

export const createFeedbackSchema = z.object({
  type: z.enum(["complaint", "suggestion", "praise", "question"]),
  subject: z.string().min(1).max(300),
  message: z.string().min(1).max(5000),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  customerName: z.string().max(200).optional(),
  customerEmail: email.optional(),
  customerPhone: phone.optional(),
});

export const updateFeedbackSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  assignedTo: z.string().max(100).optional(),
  response: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
}).refine(data => Object.keys(data).length > 0, { message: "At least one field must be provided" });

// ── Lead schemas ─────────────────────────────────────────────────────────────

export const createLeadSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  email,
  phone: phone.optional(),
  company: z.string().trim().max(200).optional(),
  companySize: z.string().max(50).optional(),
  industry: z.string().max(100).optional(),
  source: z.string().max(100).optional(),
  interest: z.string().max(300).optional(),
  message: z.string().trim().max(5000).optional(),
  consultationType: z.enum(["video_call", "phone_call", "in_person"]).optional().or(z.literal("")),
  calendlyBookingLink: z.string().url().max(2048)
    .refine(isCalendlyHttpsUrl, "Invalid Calendly booking link")
    .optional()
    .or(z.literal("")),
});

// ── Proposal schemas ─────────────────────────────────────────────────────────

export const createProposalSchema = z.object({
  title: z.string().min(1).max(300),
  clientId: cuid.optional(),
  clientName: z.string().max(200).optional(),
  clientEmail: email.optional(),
  description: optionalString,
  amount: price.optional(),
  validUntil: z.string().datetime().optional(),
  items: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: quantity,
    price: price,
  })).optional(),
});

// ── Subscription / Payment schemas ───────────────────────────────────────────

export const createPaymentSchema = z.object({
  planId: cuid,
  paymentMethod: z.enum(["paypro", "payoneer", "bank_transfer", "crypto"]).optional(),
});

export const payproCreateOrderSchema = z.object({
  planId: cuid,
});

// ── Settings schemas ─────────────────────────────────────────────────────────

export const updateSettingsSchema = z.object({
  // Brand settings
  brandTagline: z.string().max(200).optional(),
  brandColor: hexColor,
  secondaryBrandColor: hexColor,
  brandDescription: z.string().max(2000).optional(),
  // General settings
  currency: z.string().length(3).optional(),
  timezone: z.string().max(50).optional(),
  workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  phone: phone.optional(),
  email: email.optional(),
  website: url,
  address: optionalString,
});

export const seoSettingsSchema = z.object({
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  ogTitle: z.string().max(60).optional(),
  ogDescription: z.string().max(160).optional(),
  keywords: z.array(z.string().max(50)).max(20).optional(),
});

export const whiteLabelSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  companyName: z.string().max(100).optional(),
  supportEmail: email.optional(),
  supportUrl: url,
  privacyUrl: url,
  termsUrl: url,
});

// ── Admin schemas ────────────────────────────────────────────────────────────

export const adminUpdatePlanSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  price: price.optional(),
  features: z.array(z.string().max(200)).max(50).optional(),
  orderLimit: positiveInt.optional(),
  productLimit: positiveInt.optional(),
  customerLimit: positiveInt.optional(),
  isActive: z.boolean().optional(),
});

export const adminUpdateSubscriptionSchema = z.object({
  status: z.enum(["active", "cancelled", "expired", "trialing"]).optional(),
  planId: cuid.optional(),
  endDate: z.string().datetime().optional(),
});

export const adminFeatureToggleSchema = z.object({
  features: z.record(z.boolean()).refine(obj => Object.keys(obj).length <= 20, { message: "Maximum 20 features allowed" }),
});

// ── Flash Sale schemas ───────────────────────────────────────────────────────

export const createFlashSaleSchema = z.object({
  productId: cuid,
  discountPercentage: z.number().min(1).max(99),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  maxQuantity: positiveInt.optional(),
});

// ── Lead Magnet schemas ──────────────────────────────────────────────────────

export const createLeadMagnetSchema = z.object({
  title: z.string().min(1).max(300),
  description: optionalString,
  type: z.enum(["ebook", "checklist", "template", "guide", "video"]).optional(),
  downloadUrl: z.string().max(2048).optional(),
  ctaText: z.string().max(100).optional(),
});

// ── SLA schemas ──────────────────────────────────────────────────────────────

export const createSlaRuleSchema = z.object({
  name: z.string().min(1).max(100),
  responseTimeHours: z.number().min(0).max(8760),
  resolutionTimeHours: z.number().min(0).max(8760),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
});

// ── Follow-up schemas ────────────────────────────────────────────────────────

export const createFollowupRuleSchema = z.object({
  triggerEvent: z.string().min(1).max(100),
  delayHours: z.number().min(0).max(8760),
  channel: z.enum(["whatsapp", "email", "sms"]).optional(),
  message: z.string().min(1).max(5000),
});

// ── Attendance schemas ───────────────────────────────────────────────────────

export const markAttendanceSchema = z.object({
  type: z.enum(["check_in", "check_out"]),
  note: optionalString,
});

// ── Push notification schemas ────────────────────────────────────────────────

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(500),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const pushSendSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  url: z.string().url().max(2048).optional(),
  icon: z.string().url().max(2048).optional(),
});

// ── Integration schemas ──────────────────────────────────────────────────────

export const createIntegrationSchema = z.object({
  provider: z.enum(["whatsapp", "google", "meta", "stripe", "paypro", "calendly", "hubspot", "mailchimp", "zapier", "custom"]),
  config: z.record(z.string().max(500)).refine(obj => Object.keys(obj).length <= 20, { message: "Maximum 20 config entries allowed" }),
  isActive: z.boolean().default(true),
});

// ── Pagination query schema ──────────────────────────────────────────────────

export const paginationQuerySchema = z.object({
  page: paginationPage,
  limit: paginationLimit,
  search: z.string().max(200).optional(),
  sortBy: z.string().max(50).optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

// ── Extended schemas for API routes ──────────────────────────────────────────
// These extend base schemas to cover all fields handled by specific routes,
// preventing mass-assignment while preserving existing functionality.

/** Customer update schema covering all route-handled fields including city, loyaltyTier, etc. */
export const updateCustomerDetailSchema = updateCustomerSchema.extend({
  city: z.string().max(200).optional(),
  loyaltyTier: z.string().max(50).optional(),
  totalSpent: z.number().min(0).optional(),
  orderCount: z.number().int().min(0).optional(),
});

/** Coupon update schema matching Prisma model field names (type, value, minOrder, etc.) */
export const updateCouponApiSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  type: z.enum(["percentage", "fixed"]).optional(),
  value: z.number().min(0).max(1000000).optional(),
  minOrder: z.number().min(0).max(99999999.99).optional(),
  usageLimit: z.number().int().min(0).max(2147483647).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
}).refine(data => Object.keys(data).length > 0, { message: "At least one field must be provided" });

/** Order update schema with courier, trackingNumber, and priority fields */
export const updateOrderDetailSchema = z.object({
  status: z.enum(["pending", "confirmed", "packed", "dispatched", "delivered", "cancelled", "returned"]).optional(),
  notes: optionalString,
  channel: z.enum(["manual", "whatsapp", "website", "instagram", "facebook", "phone"]).optional(),
  courier: z.string().max(200).optional(),
  trackingNumber: z.string().max(200).optional(),
  priority: z.number().int().min(0).max(100).optional(),
}).refine(data => Object.keys(data).length > 0, { message: "At least one field must be provided" });

/** Member role update schema matching the actual API shape (roleId / roleName) */
export const updateMemberRoleApiSchema = z.object({
  roleId: z.string().min(1).max(50).optional(),
  roleName: z.string().min(1).max(100).optional(),
}).refine(data => data.roleId || data.roleName, { message: "roleId or roleName is required" });

/** Settings update schema covering all fields handled by the settings route */
export const updateSettingsApiSchema = updateOrganizationSchema.extend({
  id: z.string().max(50).optional(),
  logo: z.string().max(2048).optional().nullable(),
  favicon: z.string().max(2048).optional().nullable(),
  taxId: z.string().max(100).optional().nullable(),
});

// ── Type exports (inferred from schemas) ─────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateBroadcastInput = z.infer<typeof createBroadcastSchema>;
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type UpdateCustomerDetailInput = z.infer<typeof updateCustomerDetailSchema>;
export type UpdateCouponApiInput = z.infer<typeof updateCouponApiSchema>;
export type UpdateOrderDetailInput = z.infer<typeof updateOrderDetailSchema>;
export type UpdateMemberRoleApiInput = z.infer<typeof updateMemberRoleApiSchema>;
export type UpdateSettingsApiInput = z.infer<typeof updateSettingsApiSchema>;
export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;
