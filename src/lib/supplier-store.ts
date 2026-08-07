// src/lib/supplier-store.ts
// ─────────────────────────────────────────────────────────────────────────────
// Supplier validations + permission helpers (PR #6: Suppliers persistence)
// ─────────────────────────────────────────────────────────────────────────────
// Mirrors the pattern in product-category-store.ts: validation schemas +
// role-based permission helpers in a single "store" module.
//
// Key team-member review requirements enforced here:
//   - Ratings: 1-5 or null (clearing allowed) — see createSupplierSchema.rating
//   - Viewer accounts: read-only — see canWriteSuppliers
//   - Org ID is sourced from session in API routes, NOT from these schemas
//     (schemas intentionally exclude organizationId to prevent client-side spoofing)

import { z } from "zod";
import { paginationQuerySchema } from "@/lib/validations";

// ─────────────────────────────────────────────────────────────────────────────
// ROLE PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────
// Real Valtriox roles (see src/lib/roles.ts → ROLES array):
//   Platform:  platform_owner, platform_admin, valtriox_team
//   Brand:     brand_owner, brand_admin, operations_manager, sales_manager,
//              marketing_manager, warehouse_manager, support_agent,
//              content_creator, accountant, team_lead, sales_rep,
//              inventory_clerk, viewer, custom
//
// Supplier management is part of "operations". The roles explicitly granted
// operations access in ROLES are: brand_owner, brand_admin, operations_manager.
// Platform roles get full access via isPlatformRole().
//
// Backward-compat: legacy role names (owner/admin/manager) are kept mapped
// to their brand-equivalent write access so existing orgs aren't broken
// during the role migration window.

import { isPlatformRole } from "./roles";

/** Roles that can create/update/delete suppliers and change ratings. */
const SUPPLIER_WRITE_ROLES = new Set([
  // Real Valtriox brand roles with operations access
  "brand_owner",
  "brand_admin",
  "operations_manager",
  // Legacy fallback (backwards compatibility during role migration)
  "owner",
  "admin",
  "manager",
]);

/**
 * Returns true if the given role can view suppliers.
 *
 * All authenticated org members can read supplier lists, including
 * viewers (read-only) and "custom" roles — write access is gated
 * separately by canWriteSuppliers.
 */
export function canReadSuppliers(role: string | undefined | null): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  // Platform roles always pass
  if (isPlatformRole(normalized)) return true;
  // Any non-empty role can read (viewer, member, custom, all brand roles)
  return normalized.length > 0;
}

/**
 * Returns true if the given role can create/update/delete suppliers
 * and change ratings. Viewer and member accounts are read-only.
 *
 * Team-member review requirement: "Viewer accounts must remain read-only."
 *
 * Rules:
 *   1. Platform roles (platform_owner, platform_admin, valtriox_team,
 *      plus legacy owner/admin) → full write access
 *   2. Brand roles with operations permission → write access
 *      (brand_owner, brand_admin, operations_manager)
 *   3. All other roles (viewer, sales_rep, etc.) → read-only
 *   4. "custom" role → conservatively denied (use roleId-based DB check
 *      in the route handler if you need per-org custom permissions)
 */
export function canWriteSuppliers(role: string | undefined | null): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  // Platform roles always pass
  if (isPlatformRole(normalized)) return true;
  // Brand roles with explicit operations access
  return SUPPLIER_WRITE_ROLES.has(normalized);
}

// ─────────────────────────────────────────────────────────────────────────────
// ALLOWED STATUS VALUES
// ─────────────────────────────────────────────────────────────────────────────
// Codebase convention: status stored as String (no Prisma enums).
// We enforce allowed values at the Zod layer instead.

export const SUPPLIER_STATUSES = ["active", "inactive", "blacklisted"] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// CREATE SCHEMA — POST /api/operations/suppliers
// ─────────────────────────────────────────────────────────────────────────────
//
// Notes:
//   - organizationId is INTENTIONALLY ABSENT — sourced from authCtx in the API
//   - rating accepts 1-5 or null/undefined (null = unrated at creation time)
//   - email accepts empty string "" which we normalize to null in the API
//   - status defaults to "active"

export const createSupplierSchema = z.object({
  name: z
    .string()
    .min(1, "Supplier name is required")
    .max(200, "Name must be 200 characters or less")
    .trim(),

  contactPerson: z
    .string()
    .max(200, "Contact person name must be 200 characters or less")
    .trim()
    .optional()
    .nullable(),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email format")
    .max(255, "Email must be 255 characters or less")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),

  phone: z
    .string()
    .max(50, "Phone must be 50 characters or less")
    .trim()
    .optional()
    .nullable(),

  category: z
    .string()
    .max(100, "Category must be 100 characters or less")
    .trim()
    .optional()
    .default("General"),

  status: z.enum(SUPPLIER_STATUSES).optional().default("active"),

  address: z
    .string()
    .max(2000, "Address must be 2000 characters or less")
    .trim()
    .optional()
    .nullable(),

  notes: z
    .string()
    .max(5000, "Notes must be 5000 characters or less")
    .trim()
    .optional()
    .nullable(),

  // Rating: 1-5 stars or null/undefined (null = unrated/cleared).
  // Team-member review: "Ratings must support values 1–5 and null for clearing."
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5")
    .optional()
    .nullable(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE SCHEMA — PATCH /api/operations/suppliers/[id]
// ─────────────────────────────────────────────────────────────────────────────
//
// All fields optional. At least one must be present (enforced via .refine).
// rating: 1-5 to set, null to clear, undefined to leave unchanged.
//   This is the critical distinction:
//     - { rating: 5 }       → set rating to 5
//     - { rating: null }    → clear rating (set to NULL in DB)
//     - { rating: undefined } → don't touch rating (omitted from PATCH body)
//
// Zod preserves the difference between null and undefined for optional fields.

export const updateSupplierSchema = z
  .object({
    name: z
      .string()
      .min(1, "Supplier name cannot be empty")
      .max(200)
      .trim()
      .optional(),

    contactPerson: z.string().max(200).trim().optional().nullable(),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email format")
      .max(255)
      .optional()
      .nullable()
      .or(z.literal("").transform(() => null)),

    phone: z.string().max(50).trim().optional().nullable(),

    category: z.string().max(100).trim().optional(),

    status: z.enum(SUPPLIER_STATUSES).optional(),

    address: z.string().max(2000).trim().optional().nullable(),

    notes: z.string().max(5000).trim().optional().nullable(),

    // Rating: 1-5 to update, null to clear, omit to leave unchanged.
    // The .nullable() + .optional() combo preserves the tri-state.
    rating: z
      .number()
      .int("Rating must be a whole number")
      .min(1, "Rating must be between 1 and 5")
      .max(5, "Rating must be between 1 and 5")
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
    path: [],
  });

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// LIST QUERY SCHEMA — GET /api/operations/suppliers
// ─────────────────────────────────────────────────────────────────────────────
//
// Extends paginationQuerySchema (page, limit, search) with supplier-specific
// filters. Note: orgId is NOT accepted from query — it always comes from
// authCtx (prevents cross-org access via query param spoofing).

export const suppliersQuerySchema = paginationQuerySchema.extend({
  category: z.string().max(100).optional(),
  status: z.enum(SUPPLIER_STATUSES).optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  maxRating: z.coerce.number().int().min(1).max(5).optional(),
});

export type SuppliersQuery = z.infer<typeof suppliersQuerySchema>;