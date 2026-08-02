import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const testState = vi.hoisted(() => ({
  organizationId: "org-a" as string | undefined,
  role: "brand_owner",
  settings: new Map<string, { value: string; category: string }>(),
  legacyCategories: [] as string[],
}));

const dbMocks = vi.hoisted(() => {
  const product = {
    findMany: vi.fn(async () => testState.legacyCategories.map((category) => ({ category }))),
    findFirst: vi.fn(async ({ where }: { where: { id?: string; organizationId?: string } }) => (
      where.id === "product-1" && where.organizationId === "org-a"
        ? { id: "product-1", organizationId: "org-a", name: "Existing" }
        : null
    )),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "product-new", ...data })),
    update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "product-1", ...data })),
    count: vi.fn(),
    aggregate: vi.fn(),
    delete: vi.fn(),
  };

  const systemSetting = {
    findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
      const setting = testState.settings.get(where.key);
      return setting ? { id: where.key, ...setting } : null;
    }),
  };

  return {
    db: {
      product,
      systemSetting,
      orderItem: { deleteMany: vi.fn() },
    },
    product,
  };
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

import { POST } from "@/app/api/products/route";
import { PATCH } from "@/app/api/products/[id]/route";
import {
  productCategorySettingGroup,
  productCategorySettingKey,
} from "@/lib/product-category-store";

function registerCategory(name: string): void {
  testState.settings.set(productCategorySettingKey("org-a", name), {
    value: name,
    category: productCategorySettingGroup("org-a"),
  });
}

function productRequest(method: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/products", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validProduct = {
  name: "Desk Lamp",
  price: 2500,
  costPrice: null,
  stock: 4,
  category: " electronics ",
  status: "active",
};

describe("product category assignment invariant", () => {
  beforeEach(() => {
    testState.organizationId = "org-a";
    testState.role = "brand_owner";
    testState.settings.clear();
    testState.legacyCategories.length = 0;
    vi.clearAllMocks();
    registerCategory("Electronics");
  });

  it("creates a product with the canonical registered category and nullable cost price", async () => {
    const response = await POST(productRequest("POST", validProduct));

    expect(response.status).toBe(201);
    expect(dbMocks.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ category: "Electronics", costPrice: null }),
    });
  });

  it("rejects a stale or fabricated category before creating a product", async () => {
    const response = await POST(productRequest("POST", {
      ...validProduct,
      category: "Deleted Category",
    }));

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("no longer exists");
    expect(dbMocks.product.create).not.toHaveBeenCalled();
  });

  it("updates a product category and can explicitly clear its cost price", async () => {
    const response = await PATCH(
      productRequest("PATCH", { category: "ELECTRONICS", costPrice: null }),
      { params: Promise.resolve({ id: "product-1" }) },
    );

    expect(response.status).toBe(200);
    expect(dbMocks.product.update).toHaveBeenCalledWith({
      where: { id: "product-1" },
      data: expect.objectContaining({ category: "Electronics", costPrice: null }),
    });
    const updateData = dbMocks.product.update.mock.calls[0]?.[0]?.data;
    expect(updateData).not.toHaveProperty("status");
  });

  it("rejects stale category assignment from an already-open edit dialog", async () => {
    const response = await PATCH(
      productRequest("PATCH", { category: "Removed While Dialog Was Open" }),
      { params: Promise.resolve({ id: "product-1" }) },
    );

    expect(response.status).toBe(409);
    expect(dbMocks.product.update).not.toHaveBeenCalled();
  });

  it("blocks product writes for viewers and sessions without an organization", async () => {
    testState.role = "viewer";
    expect((await POST(productRequest("POST", validProduct))).status).toBe(403);
    expect(dbMocks.product.create).not.toHaveBeenCalled();

    testState.role = "platform_owner";
    testState.organizationId = undefined;
    expect((await POST(productRequest("POST", validProduct))).status).toBe(403);
    expect(dbMocks.product.create).not.toHaveBeenCalled();
  });
});
