import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, dbErrorResponse, isDbUnavailable, withRetry } from "@/lib/db";
import { withAuth, type AuthContext } from "@/lib/auth-middleware";
import { validateBody } from "@/lib/validations/api";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import {
  isReservedProductCategoryName,
  mergeProductCategorySummaries,
  normalizeProductCategoryName,
} from "@/lib/product-categories";
import {
  canWriteProductCatalog,
  findMatchingRawProductCategories,
  getStoredProductCategoryNames,
  isUniqueConstraintError,
  productCategorySettingGroup,
  productCategorySettingKey,
} from "@/lib/product-category-store";

const categoryNameSchema = z
  .string()
  .max(100, "Category name must be 100 characters or fewer")
  .transform(normalizeProductCategoryName)
  .refine((value) => value.length > 0, "Category name is required")
  .refine((value) => !isReservedProductCategoryName(value), '"Uncategorized" is reserved');

const createCategorySchema = z.object({ name: categoryNameSchema });
const renameCategorySchema = z.object({
  oldName: categoryNameSchema,
  newName: categoryNameSchema,
});
const deleteCategorySchema = z.object({ name: categoryNameSchema });

class CategoryRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "CategoryRequestError";
  }
}

function json(data: Record<string, unknown>, status = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  response.headers.set("Vary", "Cookie");
  return response;
}

function organizationIdOrResponse(authCtx: AuthContext): string | NextResponse {
  if (authCtx.organizationId) return authCtx.organizationId;
  return json({ error: "Select an organization before managing product categories." }, 403);
}

function mutationAccessResponse(authCtx: AuthContext): NextResponse | null {
  if (canWriteProductCatalog(authCtx.role)) return null;
  return json({ error: "Read-only users cannot change product categories." }, 403);
}

export const GET = withRateLimit(withAuth(async (_req, authCtx) => {
  const organizationId = organizationIdOrResponse(authCtx);
  if (organizationId instanceof NextResponse) return organizationId;

  try {
    const [storedNames, groups] = await withRetry(async () => Promise.all([
      getStoredProductCategoryNames(db, organizationId),
      db.product.groupBy({
        by: ["category"],
        where: { organizationId },
        _count: { _all: true },
        _sum: { stock: true },
      }),
    ]), 2, 500);

    return json({ categories: mergeProductCategorySummaries(storedNames, groups) });
  } catch (error: unknown) {
    logger.error("[Product Categories] GET error", error, { organizationId });
    if (isDbUnavailable(error)) return dbErrorResponse(error);
    return json({ error: "Failed to load product categories" }, 500);
  }
}), { maxRequests: 60, windowSeconds: 60 });

export const POST = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  const organizationId = organizationIdOrResponse(authCtx);
  if (organizationId instanceof NextResponse) return organizationId;
  const forbidden = mutationAccessResponse(authCtx);
  if (forbidden) return forbidden;

  const result = await validateBody(req, createCategorySchema);
  if (!result.success) return result.response;
  const { name } = result.data;

  try {
    const [existingSetting, matchingRawValues] = await withRetry(async () => Promise.all([
      db.systemSetting.findUnique({
        where: { key: productCategorySettingKey(organizationId, name) },
        select: { id: true },
      }),
      findMatchingRawProductCategories(db, organizationId, name),
    ]), 2, 500);

    if (existingSetting || matchingRawValues.length > 0) {
      throw new CategoryRequestError(`Category "${name}" already exists`, 409);
    }

    // One row per normalized category makes concurrent creates safe through
    // SystemSetting.key's database-level unique constraint.
    await db.systemSetting.create({
      data: {
        key: productCategorySettingKey(organizationId, name),
        value: name,
        category: productCategorySettingGroup(organizationId),
      },
    });

    return json({ category: { name, count: 0, stock: 0 } }, 201);
  } catch (error: unknown) {
    if (error instanceof CategoryRequestError) return json({ error: error.message }, error.status);
    if (isUniqueConstraintError(error)) return json({ error: `Category "${name}" already exists` }, 409);
    logger.error("[Product Categories] POST error", error, { organizationId });
    if (isDbUnavailable(error)) return dbErrorResponse(error);
    return json({ error: "Failed to create product category" }, 500);
  }
}), { maxRequests: 30, windowSeconds: 60 });

export const PATCH = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  const organizationId = organizationIdOrResponse(authCtx);
  if (organizationId instanceof NextResponse) return organizationId;
  const forbidden = mutationAccessResponse(authCtx);
  if (forbidden) return forbidden;

  const result = await validateBody(req, renameCategorySchema);
  if (!result.success) return result.response;
  const { oldName, newName } = result.data;

  try {
    const oldKey = productCategorySettingKey(organizationId, oldName);
    const newKey = productCategorySettingKey(organizationId, newName);
    const [oldSetting, rawOldValues] = await withRetry(async () => Promise.all([
      db.systemSetting.findUnique({ where: { key: oldKey }, select: { id: true } }),
      findMatchingRawProductCategories(db, organizationId, oldName),
    ]), 2, 500);

    if (!oldSetting && rawOldValues.length === 0) {
      throw new CategoryRequestError(`Category "${oldName}" was not found`, 404);
    }

    if (oldKey !== newKey) {
      const [newSetting, rawNewValues] = await withRetry(async () => Promise.all([
        db.systemSetting.findUnique({ where: { key: newKey }, select: { id: true } }),
        findMatchingRawProductCategories(db, organizationId, newName),
      ]), 2, 500);
      if (newSetting || rawNewValues.length > 0) {
        throw new CategoryRequestError(`Category "${newName}" already exists`, 409);
      }
    }

    const updateProducts = db.product.updateMany({
      where: { organizationId, category: { in: rawOldValues } },
      data: { category: newName },
    });

    let updatedProducts: number;
    if (oldKey === newKey) {
      const [updateResult] = await db.$transaction([
        updateProducts,
        db.systemSetting.upsert({
          where: { key: oldKey },
          create: {
            key: oldKey,
            value: newName,
            category: productCategorySettingGroup(organizationId),
          },
          update: { value: newName, category: productCategorySettingGroup(organizationId) },
        }),
      ]);
      updatedProducts = updateResult.count;
    } else {
      const [, updateResult] = await db.$transaction([
        db.systemSetting.create({
          data: {
            key: newKey,
            value: newName,
            category: productCategorySettingGroup(organizationId),
          },
        }),
        updateProducts,
        db.systemSetting.deleteMany({ where: { key: oldKey } }),
      ]);
      updatedProducts = updateResult.count;
    }

    return json({ category: { name: newName }, updatedProducts });
  } catch (error: unknown) {
    if (error instanceof CategoryRequestError) return json({ error: error.message }, error.status);
    if (isUniqueConstraintError(error)) return json({ error: `Category "${newName}" already exists` }, 409);
    logger.error("[Product Categories] PATCH error", error, { organizationId });
    if (isDbUnavailable(error)) return dbErrorResponse(error);
    return json({ error: "Failed to rename product category" }, 500);
  }
}), { maxRequests: 30, windowSeconds: 60 });

export const DELETE = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  const organizationId = organizationIdOrResponse(authCtx);
  if (organizationId instanceof NextResponse) return organizationId;
  const forbidden = mutationAccessResponse(authCtx);
  if (forbidden) return forbidden;

  const result = await validateBody(req, deleteCategorySchema);
  if (!result.success) return result.response;
  const { name } = result.data;

  try {
    const key = productCategorySettingKey(organizationId, name);
    const [setting, rawValues] = await withRetry(async () => Promise.all([
      db.systemSetting.findUnique({ where: { key }, select: { id: true } }),
      findMatchingRawProductCategories(db, organizationId, name),
    ]), 2, 500);

    if (!setting && rawValues.length === 0) {
      throw new CategoryRequestError(`Category "${name}" was not found`, 404);
    }

    const [updateResult] = await db.$transaction([
      db.product.updateMany({
        where: { organizationId, category: { in: rawValues } },
        data: { category: null },
      }),
      db.systemSetting.deleteMany({ where: { key } }),
    ]);

    return json({ success: true, movedProducts: updateResult.count });
  } catch (error: unknown) {
    if (error instanceof CategoryRequestError) return json({ error: error.message }, error.status);
    logger.error("[Product Categories] DELETE error", error, { organizationId });
    if (isDbUnavailable(error)) return dbErrorResponse(error);
    return json({ error: "Failed to delete product category" }, 500);
  }
}), { maxRequests: 30, windowSeconds: 60 });
