/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const navigationMocks = vi.hoisted(() => ({
  setActiveSection: vi.fn(),
}));

vi.mock("@/store/brandflow-store", () => ({
  useValtrioxStore: () => ({
    organization: { id: "org-a", currency: "PKR", country: "Pakistan" },
    appTheme: "dark",
    setActiveSection: navigationMocks.setActiveSection,
  }),
}));

vi.mock("@/lib/fetch-with-auth", () => ({
  fetchWithAuth: vi.fn(async (url: string) => new Response(JSON.stringify(
    url.startsWith("/api/products?")
      ? { products: [], stats: { total: 0, active: 0, lowStock: 0, totalValue: 0 } }
      : { categories: [] },
  ), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })),
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => (key: string) => key,
}));

vi.mock("@/components/brandflow/products/ProductModal", () => ({
  ProductModal: ({ open, onClose, product }: {
    open: boolean;
    onClose: () => void;
    product?: unknown;
  }) => (
    <div
      data-product-modal="true"
      data-open={String(open)}
      data-mode={product ? "edit" : "create"}
    >
      <button type="button" onClick={onClose}>Close test modal</button>
    </div>
  ),
}));

import { ProductsPage } from "@/components/brandflow/products/ProductsPage";

describe("product section navigation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    navigationMocks.setActiveSection.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("opens the blank creation modal when entered through Add Product", async () => {
    await act(async () => {
      root.render(<ProductsPage openCreateOnMount />);
    });
    await act(async () => new Promise((done) => window.setTimeout(done, 10)));

    const modal = container.querySelector<HTMLElement>("[data-product-modal]");
    expect(modal?.dataset.open).toBe("true");
    expect(modal?.dataset.mode).toBe("create");
  });

  it("returns to the Products section when the entry modal is closed", async () => {
    await act(async () => {
      root.render(<ProductsPage openCreateOnMount />);
    });
    await act(async () => new Promise((done) => window.setTimeout(done, 10)));

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-product-modal] button")?.click();
    });

    expect(navigationMocks.setActiveSection).toHaveBeenCalledWith("products");
  });

  it("keeps Catalog distinct and maps product subsections to their intended views", () => {
    const pageSource = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");

    expect(pageSource).toMatch(/case "add-product": return[^\n]+<ProductsPage initialTab="all" openCreateOnMount \/>/);
    expect(pageSource).toMatch(/case "categories": return[^\n]+<ProductsPage initialTab="categories" \/>/);
    expect(pageSource).toMatch(/case "inventory": return[^\n]+<ProductsPage initialTab="inventory" \/>/);
    expect(pageSource).toMatch(/case "catalog": return[^\n]+<CatalogPage \/>/);
  });
});
