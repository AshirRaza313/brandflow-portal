import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  isReservedProductCategoryName,
  isUncategorizedProductCategory,
  mergeProductCategoryNames,
  normalizeProductCategoryName,
  productCategoryKey,
} from "@/lib/product-categories";

export const PRODUCT_CATEGORY_SETTING_TYPE = "product-category";

type ProductCategoryClient = Pick<PrismaClient, "product" | "systemSetting">;

export function productCategorySettingGroup(organizationId: string): string {
  return `${PRODUCT_CATEGORY_SETTING_TYPE}:${organizationId}`;
}

export function productCategorySettingKey(organizationId: string, name: string): string {
  const digest = createHash("sha256").update(productCategoryKey(name)).digest("hex");
  return `${productCategorySettingGroup(organizationId)}:${digest}`;
}

export function canWriteProductCatalog(role: string): boolean {
  return role.trim().toLocaleLowerCase("en-US") !== "viewer";
}

export async function getStoredProductCategoryNames(
  client: ProductCategoryClient,
  organizationId: string,
): Promise<string[]> {
  const settings = await client.systemSetting.findMany({
    where: { category: productCategorySettingGroup(organizationId) },
    select: { value: true },
  });

  return mergeProductCategoryNames(settings.map((setting) => setting.value));
}

export async function findMatchingRawProductCategories(
  client: ProductCategoryClient,
  organizationId: string,
  requestedName: string,
): Promise<string[]> {
  const requestedKey = productCategoryKey(requestedName);
  const values = await client.product.findMany({
    where: { organizationId, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });

  return values
    .map((item) => item.category)
    .filter((value): value is string => typeof value === "string" && productCategoryKey(value) === requestedKey);
}

export type ProductCategoryResolution =
  | { ok: true; name: string | null }
  | { ok: false; error: string };

/**
 * Resolve a submitted product category against the authenticated organization's
 * registry. Product-derived legacy categories remain assignable until deleted.
 */
export async function resolveAssignableProductCategory(
  client: ProductCategoryClient,
  organizationId: string,
  submittedName: string | null | undefined,
): Promise<ProductCategoryResolution> {
  if (submittedName === null || submittedName === undefined) return { ok: true, name: null };

  const normalizedName = normalizeProductCategoryName(submittedName);
  if (!normalizedName || isUncategorizedProductCategory(normalizedName)) {
    return { ok: true, name: null };
  }
  if (isReservedProductCategoryName(normalizedName)) {
    return { ok: false, error: "Invalid product category" };
  }

  const [setting, matchingRawValues] = await Promise.all([
    client.systemSetting.findUnique({
      where: { key: productCategorySettingKey(organizationId, normalizedName) },
      select: { value: true },
    }),
    findMatchingRawProductCategories(client, organizationId, normalizedName),
  ]);

  if (setting) {
    const storedName = mergeProductCategoryNames([setting.value])[0];
    if (storedName) return { ok: true, name: storedName };
  }

  if (matchingRawValues.length > 0) {
    return { ok: true, name: normalizeProductCategoryName(matchingRawValues[0]) };
  }

  return {
    ok: false,
    error: `Category "${normalizedName}" no longer exists. Refresh the page and choose an available category.`,
  };
}

export function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && error.code === "P2002",
  );
}
