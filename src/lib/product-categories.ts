export const UNCATEGORIZED_PRODUCT_CATEGORY = "Uncategorized";
export const UNASSIGNED_PRODUCT_CATEGORY_VALUE = "__valtriox_unassigned_category__";

export interface ProductCategorySummary {
  name: string;
  count: number;
  stock: number;
}

interface ProductCategoryGroup {
  category: string | null;
  _count: { _all: number };
  _sum: { stock: number | null };
}

export function normalizeProductCategoryName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function productCategoryKey(value: string): string {
  return normalizeProductCategoryName(value).toLocaleLowerCase("en-US");
}

export function isUncategorizedProductCategory(value: string): boolean {
  return productCategoryKey(value) === productCategoryKey(UNCATEGORIZED_PRODUCT_CATEGORY);
}

export function isReservedProductCategoryName(value: string): boolean {
  return isUncategorizedProductCategory(value)
    || productCategoryKey(value) === productCategoryKey(UNASSIGNED_PRODUCT_CATEGORY_VALUE);
}

export function mergeProductCategoryNames(names: string[]): string[] {
  const unique = new Map<string, string>();

  for (const value of names) {
    if (typeof value !== "string") continue;
    const name = normalizeProductCategoryName(value);
    if (!name || isReservedProductCategoryName(name)) continue;
    const key = productCategoryKey(name);
    if (!unique.has(key)) unique.set(key, name);
  }

  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
}

export function parseStoredProductCategories(value?: string | null): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return mergeProductCategoryNames(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return [];
  }
}

export function hasProductCategory(names: string[], candidate: string): boolean {
  const candidateKey = productCategoryKey(candidate);
  return names.some((name) => productCategoryKey(name) === candidateKey);
}

export function mergeProductCategorySummaries(
  storedNames: string[],
  groups: ProductCategoryGroup[],
): ProductCategorySummary[] {
  const summaries = new Map<string, ProductCategorySummary>();

  for (const name of mergeProductCategoryNames(storedNames)) {
    summaries.set(productCategoryKey(name), { name, count: 0, stock: 0 });
  }

  for (const group of groups) {
    const normalized = group.category
      ? normalizeProductCategoryName(group.category)
      : UNCATEGORIZED_PRODUCT_CATEGORY;
    const name = !normalized || isReservedProductCategoryName(normalized)
      ? UNCATEGORIZED_PRODUCT_CATEGORY
      : normalized;
    const key = productCategoryKey(name);
    const existing = summaries.get(key) || { name, count: 0, stock: 0 };

    existing.count += group._count._all;
    existing.stock += group._sum.stock || 0;
    summaries.set(key, existing);
  }

  return Array.from(summaries.values()).sort((a, b) => {
    const aUncategorized = isUncategorizedProductCategory(a.name);
    const bUncategorized = isUncategorizedProductCategory(b.name);
    if (aUncategorized !== bUncategorized) return aUncategorized ? 1 : -1;
    if (a.count !== b.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });
}
