/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/store/brandflow-store", () => ({
  useValtrioxStore: () => ({ appTheme: "premium-dark" }),
}));

import { PricingRulesPage } from "@/components/brandflow/products/PricingRulesPage";
import { VariantsPage } from "@/components/brandflow/products/VariantsPage";

const scrollIntoViewMock = vi.fn();

function findActionButton(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
    .find((button) => button.getAttribute("role") !== "tab" && button.textContent?.trim() === label);
}

describe("product tools dark theme and header actions", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock,
    });
  });

  beforeEach(() => {
    scrollIntoViewMock.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("uses dark, horizontally scrollable Pricing Rules navigation and opens Rule Builder", async () => {
    await act(async () => {
      root.render(<PricingRulesPage />);
    });

    const tabList = container.querySelector<HTMLElement>("[role='tablist']");
    const tableHeader = container.querySelector<HTMLElement>("thead tr");
    expect(tabList?.className).toContain("bg-white/[0.04]");
    expect(tabList?.className).not.toContain("bg-slate-100");
    expect(tabList?.className).toContain("flex-nowrap");
    expect(tabList?.className).toContain("max-w-full");
    expect(tabList?.className).toContain("overflow-x-auto");
    expect(tableHeader?.className).toContain("bg-white/[0.03]");

    const newRuleButton = findActionButton(container, "New Rule");
    expect(newRuleButton).toBeTruthy();
    await act(async () => newRuleButton?.click());

    const builderTab = Array.from(container.querySelectorAll<HTMLElement>("[role='tab']"))
      .find((tab) => tab.textContent?.trim() === "Rule Builder");
    expect(builderTab?.getAttribute("aria-selected")).toBe("true");
    expect(container.textContent).toContain("Create New Pricing Rule");
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("uses dark, horizontally scrollable Variant navigation and opens Add Variant", async () => {
    await act(async () => {
      root.render(<VariantsPage />);
    });

    const tabList = container.querySelector<HTMLElement>("[role='tablist']");
    expect(tabList?.className).toContain("bg-white/[0.04]");
    expect(tabList?.className).not.toContain("bg-slate-100");
    expect(tabList?.className).toContain("flex-nowrap");
    expect(tabList?.className).toContain("max-w-full");
    expect(tabList?.className).toContain("overflow-x-auto");

    const addVariantButton = findActionButton(container, "Add Variant");
    expect(addVariantButton).toBeTruthy();
    await act(async () => addVariantButton?.click());

    const addTab = Array.from(container.querySelectorAll<HTMLElement>("[role='tab']"))
      .find((tab) => tab.textContent?.trim() === "Add Variant");
    expect(addTab?.getAttribute("aria-selected")).toBe("true");
    expect(container.textContent).toContain("Add New Variant");
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });
});
