import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const testState = vi.hoisted(() => ({
  organizationId: "org-a" as string | undefined,
  role: "brand_owner",
  settings: new Map<string, { value: string; category: string }>(),
  products: [] as Array<{
    id: string;
    organizationId: string;
    category: string | null;
    stock: number;
  }>,
}));

const dbMocks = vi.hoisted(() => {
  const matchesCategory = (
    productCategory: string | null,
    filter: string | { equals?: string; mode?: string; in?: string[]; not?: null } | null | undefined,
  ) => {
    if (filter === null) return productCategory === null;
    if (typeof filter === "object" && Array.isArray(filter.in)) return filter.in.includes(productCategory || "");
    if (typeof filter === "object" && "not" in filter && filter.not === null) return productCategory !== null;
    const expected = typeof filter === "string" ? filter : filter?.equals;
    if (expected === undefined) return true;
    if (typeof filter === "object" && filter.mode === "insensitive") {
      return (productCategory || "").toLocaleLowerCase("en-US") === expected.toLocaleLowerCase("en-US");
    }
    return productCategory === expected;
  };

  const systemSetting = {
    findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
      const setting = testState.settings.get(where.key);
      return setting ? { id: where.key, key: where.key, ...setting } : null;
    }),
    findMany: vi.fn(async ({ where }: { where: { category: string } }) => {
      return Array.from(testState.settings.entries())
        .filter(([, setting]) => setting.category === where.category)
        .map(([key, setting]) => ({ id: key, key, ...setting }));
    }),
    create: vi.fn(async ({
      data,
    }: {
      data: { key: string; value: string; category: string };
    }) => {
      if (testState.settings.has(data.key)) {
        throw Object.assign(new Error("Unique constraint"), { code: "P2002" });
      }
      testState.settings.set(data.key, { value: data.value, category: data.category });
      return { id: data.key, ...data };
    }),
    upsert: vi.fn(async ({
      where,
      create,
      update,
    }: {
      where: { key: string };
      create: { key: string; value: string; category: string };
      update: { value: string; category: string };
    }) => {
      const data = testState.settings.has(where.key) ? { key: where.key, ...update } : create;
      testState.settings.set(where.key, { value: data.value, category: data.category });
      return { id: where.key, ...data };
    }),
    deleteMany: vi.fn(async ({ where }: { where: { key: string } }) => {
      const count = testState.settings.delete(where.key) ? 1 : 0;
      return { count };
    }),
  };

  const product = {
    findMany: vi.fn(async ({
      where,
    }: {
      where: { organizationId: string; category?: string | { in?: string[]; not?: null } | null };
    }) => {
      const unique = new Set<string | null>();
      for (const item of testState.products) {
        if (item.organizationId !== where.organizationId || !matchesCategory(item.category, where.category)) continue;
        unique.add(item.category);
      }
      return Array.from(unique).map((category) => ({ category }));
    }),
    groupBy: vi.fn(async ({ where }: { where: { organizationId: string } }) => {
      const groups = new Map<string | null, { count: number; stock: number }>();
      for (const item of testState.products.filter((product) => product.organizationId === where.organizationId)) {
        const current = groups.get(item.category) || { count: 0, stock: 0 };
        current.count += 1;
        current.stock += item.stock;
        groups.set(item.category, current);
      }
      return Array.from(groups.entries()).map(([category, values]) => ({
        category,
        _count: { _all: values.count },
        _sum: { stock: values.stock },
      }));
    }),
    updateMany: vi.fn(async ({
      where,
      data,
    }: {
      where: { organizationId: string; category?: string | { in?: string[] } | null };
      data: { category: string | null };
    }) => {
      let count = 0;
      for (const item of testState.products) {
        if (item.organizationId !== where.organizationId || !matchesCategory(item.category, where.category)) continue;
        item.category = data.category;
        count += 1;
      }
      return { count };
    }),
  };

  const db = {
    systemSetting,
    product,
    $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
  };

  return { db, systemSetting, product };
});

vi.mock("@/lib/db", () => ({
  db: dbMocks.db,
  withRetry: (operation: () => unknown) => operation(),
  isDbUnavailable: () => false,
  dbErrorResponse: () => new Response(JSON.stringify({ error: "Service temporarily unavailable" }), { status: 503 }),
}));

vi.mock("@/lib/auth-middleware", () => ({
  withAuth: (handler: (...args: unknown[]) => unknown) => (req: NextRequest, context?: unknown) => handler(req, {
    userId: "user-a",
    email: "owner@example.com",
    role: testState.role,
    organizationId: testState.organizationId,
  }, context),
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: (handler: (...args: unknown[]) => unknown) => handler,
}));

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { DELETE, GET, PATCH, POST } from "@/app/api/product-categories/route";
import {
  mergeProductCategorySummaries,
  normalizeProductCategoryName,
  parseStoredProductCategories,
} from "@/lib/product-categories";
import {
  productCategorySettingGroup,
  productCategorySettingKey,
  resolveAssignableProductCategory,
} from "@/lib/product-category-store";

function jsonRequest(method: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/product-categories", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  return response.json();
}

async function getCategoryNames(): Promise<string[]> {
  const response = await GET(new NextRequest("http://localhost/api/product-categories"));
  const data = await responseJson(response) as { categories?: Array<{ name: string }> };
  return data.categories?.map((category) => category.name) || [];
}

function seedStoredCategory(organizationId: string, name: string): void {
  testState.settings.set(productCategorySettingKey(organizationId, name), {
    value: name,
    category: productCategorySettingGroup(organizationId),
  });
}

describe("product category helpers", () => {
  it("normalizes whitespace and safely parses a deduplicated stored list", () => {
    expect(normalizeProductCategoryName("  Hair   Care  ")).toBe("Hair Care");
    expect(parseStoredProductCategories('["Hair Care", " hair care ", "", "Uncategorized"]')).toEqual(["Hair Care"]);
    expect(parseStoredProductCategories("invalid-json")).toEqual([]);
  });

  it("merges empty saved categories with complete product aggregates", () => {
    expect(mergeProductCategorySummaries(["Accessories"], [
      { category: "Clothing", _count: { _all: 12 }, _sum: { stock: 40 } },
      { category: null, _count: { _all: 2 }, _sum: { stock: 3 } },
      { category: "uncategorized", _count: { _all: 1 }, _sum: { stock: 2 } },
    ])).toEqual([
      { name: "Clothing", count: 12, stock: 40 },
      { name: "Accessories", count: 0, stock: 0 },
      { name: "Uncategorized", count: 3, stock: 5 },
    ]);
  });
});

describe("product category API", () => {
  beforeEach(() => {
    testState.organizationId = "org-a";
    testState.role = "brand_owner";
    testState.settings.clear();
    testState.products.length = 0;
    vi.clearAllMocks();
  });

  it("persists a zero-product category and returns it after a fresh GET", async () => {
    const created = await POST(jsonRequest("POST", { name: "  Electronics  " }));
    expect(created.status).toBe(201);

    const response = await GET(new NextRequest("http://localhost/api/product-categories"));
    const data = await responseJson(response);

    expect(data.categories).toEqual([{ name: "Electronics", count: 0, stock: 0 }]);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Vary")).toBe("Cookie");
  });

  it("rejects reserved, blank, and case-insensitive duplicate names", async () => {
    expect((await POST(jsonRequest("POST", { name: "   " }))).status).toBe(422);
    expect((await POST(jsonRequest("POST", { name: "Uncategorized" }))).status).toBe(422);
    expect((await POST(jsonRequest("POST", { name: "__VALTRIOX_UNASSIGNED_CATEGORY__" }))).status).toBe(422);
    expect((await POST(jsonRequest("POST", { name: "Clothing" }))).status).toBe(201);

    const duplicate = await POST(jsonRequest("POST", { name: " clothing " }));
    expect(duplicate.status).toBe(409);
    expect((await responseJson(duplicate)).error).toContain("already exists");
  });

  it("uses unique rows so simultaneous same-name creates cannot both succeed", async () => {
    const [first, second] = await Promise.all([
      POST(jsonRequest("POST", { name: "Accessories" })),
      POST(jsonRequest("POST", { name: " accessories " })),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(await getCategoryNames()).toEqual(["Accessories"]);
  });

  it("renames all legacy case/whitespace variants beyond page one and persists the new card", async () => {
    seedStoredCategory("org-a", "Clothing");
    for (let index = 0; index < 15; index += 1) {
      testState.products.push({
        id: `a-${index}`,
        organizationId: "org-a",
        category: index % 2 === 0 ? " Clothing " : "clothing",
        stock: 1,
      });
    }
    testState.products.push({ id: "b-1", organizationId: "org-b", category: " Clothing ", stock: 5 });

    const response = await PATCH(jsonRequest("PATCH", { oldName: "Clothing", newName: "Apparel" }));
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    expect(data.updatedProducts).toBe(15);
    expect(testState.products.filter((item) => item.organizationId === "org-a").every((item) => item.category === "Apparel")).toBe(true);
    expect(testState.products.find((item) => item.organizationId === "org-b")?.category).toBe(" Clothing ");
    expect(await getCategoryNames()).toEqual(["Apparel"]);
  });

  it("deletes populated and empty categories and removes both cards after GET", async () => {
    seedStoredCategory("org-a", "Seasonal");
    seedStoredCategory("org-a", "Empty");
    for (let index = 0; index < 35; index += 1) {
      testState.products.push({
        id: `a-${index}`,
        organizationId: "org-a",
        category: index % 2 === 0 ? " Seasonal " : "seasonal",
        stock: 2,
      });
    }
    testState.products.push({ id: "b-1", organizationId: "org-b", category: "Seasonal", stock: 2 });

    const populated = await DELETE(jsonRequest("DELETE", { name: "Seasonal" }));
    expect(populated.status).toBe(200);
    expect((await responseJson(populated)).movedProducts).toBe(35);
    expect(testState.products.filter((item) => item.organizationId === "org-a").every((item) => item.category === null)).toBe(true);
    expect(testState.products.find((item) => item.organizationId === "org-b")?.category).toBe("Seasonal");

    const empty = await DELETE(jsonRequest("DELETE", { name: "Empty" }));
    expect(empty.status).toBe(200);
    expect((await responseJson(empty)).movedProducts).toBe(0);
    expect(await getCategoryNames()).toEqual(["Uncategorized"]);
  });

  it("keeps reads isolated by the authenticated organization", async () => {
    seedStoredCategory("org-a", "Org A Category");
    seedStoredCategory("org-b", "Org B Category");

    testState.organizationId = "org-b";
    expect(await getCategoryNames()).toEqual(["Org B Category"]);
  });

  it("rejects a platform session without an active organization before any database call", async () => {
    testState.organizationId = undefined;
    testState.role = "platform_owner";

    const response = await GET(new NextRequest("http://localhost/api/product-categories"));
    expect(response.status).toBe(403);
    expect(dbMocks.systemSetting.findMany).not.toHaveBeenCalled();
    expect(dbMocks.product.groupBy).not.toHaveBeenCalled();

    const mutation = await DELETE(jsonRequest("DELETE", { name: "Clothing" }));
    expect(mutation.status).toBe(403);
    expect(dbMocks.product.updateMany).not.toHaveBeenCalled();
  });

  it("prevents viewer mutations while allowing category reads", async () => {
    seedStoredCategory("org-a", "Read Only");
    testState.role = "viewer";

    expect((await GET(new NextRequest("http://localhost/api/product-categories"))).status).toBe(200);
    expect((await POST(jsonRequest("POST", { name: "Blocked" }))).status).toBe(403);
    expect((await PATCH(jsonRequest("PATCH", { oldName: "Read Only", newName: "Blocked" }))).status).toBe(403);
    expect((await DELETE(jsonRequest("DELETE", { name: "Read Only" }))).status).toBe(403);
    expect(dbMocks.systemSetting.create).not.toHaveBeenCalled();
    expect(dbMocks.product.updateMany).not.toHaveBeenCalled();
  });

  it("resolves only registered or legacy categories for product assignment", async () => {
    seedStoredCategory("org-a", "Electronics");
    testState.products.push({ id: "legacy", organizationId: "org-a", category: " Hair   Care ", stock: 1 });

    await expect(resolveAssignableProductCategory(dbMocks.db as never, "org-a", " electronics "))
      .resolves.toEqual({ ok: true, name: "Electronics" });
    await expect(resolveAssignableProductCategory(dbMocks.db as never, "org-a", "hair care"))
      .resolves.toEqual({ ok: true, name: "Hair Care" });
    await expect(resolveAssignableProductCategory(dbMocks.db as never, "org-a", "Deleted Category"))
      .resolves.toMatchObject({ ok: false });
    await expect(resolveAssignableProductCategory(dbMocks.db as never, "org-b", "Electronics"))
      .resolves.toMatchObject({ ok: false });
  });
});
