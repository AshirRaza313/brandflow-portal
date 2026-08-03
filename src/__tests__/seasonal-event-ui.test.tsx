/** @vitest-environment jsdom */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ActiveSeasonalEventBanner } from "@/components/brandflow/events/ActiveSeasonalEventBanner";
import type { RegionEvent } from "@/lib/events-library";

function activeEvent(overrides: Partial<RegionEvent> = {}): RegionEvent {
  return {
    id: "custom-summer-sale",
    source: "custom",
    name: "Summer Sale",
    description: "A seasonal promotion",
    date: "08-03",
    occurrenceDate: "2026-08-03",
    resolvedDate: "2026-08-03",
    emoji: "☀️",
    theme: {
      primary: "#7c3aed",
      secondary: "#d4a73a",
      gradient: "linear-gradient(135deg, #7c3aed, #d4a73a)",
      bgPattern: "#7c3aed14",
    },
    isActive: true,
    autoDetectDaysBefore: 7,
    promotionalMessage: "Save 25% this week",
    category: "commercial",
    saleStart: "2026-08-03",
    saleEnd: "2026-08-09",
    activationMode: "automatic",
    manualActive: false,
    scheduleStatus: "active",
    ...overrides,
  };
}

let mounted: { container: HTMLDivElement; root: Root } | null = null;

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  if (!mounted) return;
  await act(async () => mounted?.root.unmount());
  mounted.container.remove();
  mounted = null;
});

async function renderBanner(event: RegionEvent | null): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted = { container, root };
  await act(async () => root.render(<ActiveSeasonalEventBanner event={event} />));
  return container;
}

describe("active seasonal event banner", () => {
  it("renders the active promotion with accessible status and a machine-readable end date", async () => {
    const container = await renderBanner(activeEvent());

    const banner = container.querySelector<HTMLElement>('[role="status"][aria-label="Active seasonal promotion"]');
    if (!banner) throw new Error("Expected active seasonal promotion banner");
    expect(banner.textContent).toContain("Summer Sale");
    expect(container.textContent).toContain("Save 25% this week");
    expect(container.querySelector("time")?.getAttribute("datetime")).toBe("2026-08-09");
    expect(container.querySelector("time")?.textContent).toBe("Aug 9, 2026");
    expect(banner.getAttribute("style")).toContain("linear-gradient");
  });

  it("falls back to the description and safe colors when persisted banner data is incomplete", async () => {
    const container = await renderBanner(activeEvent({
        promotionalMessage: "",
        saleEnd: null,
        theme: {
          primary: "javascript:alert(1)",
          secondary: "red",
          gradient: "not-used",
          bgPattern: "not-used",
        },
      }));

    const banner = container.querySelector<HTMLElement>('[role="status"][aria-label="Active seasonal promotion"]');
    if (!banner) throw new Error("Expected active seasonal promotion banner");
    expect(container.textContent).toContain("A seasonal promotion");
    expect(banner.getAttribute("style")).toContain("rgb(124, 58, 237)");
    expect(banner.getAttribute("style")).toContain("rgb(212, 167, 58)");
    expect(banner.querySelector("time")).toBeNull();
  });

  it("keeps white banner copy readable when valid custom colors are nearly white", async () => {
    const container = await renderBanner(activeEvent({
      theme: {
        primary: "#ffffff",
        secondary: "#fefefe",
        gradient: "linear-gradient(135deg, #ffffff, #fefefe)",
        bgPattern: "#ffffff14",
      },
    }));

    expect(container.innerHTML).toContain("bg-black/60");
    expect(container.textContent).toContain("Summer Sale");
  });

  it("renders nothing when the server reports no active event", async () => {
    const container = await renderBanner(null);
    expect(container.innerHTML).toBe("");
  });
});

describe("seasonal event page integration", () => {
  it("places the shared experience between the dashboard header and scrollable page content", () => {
    const page = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
    const header = page.indexOf("<Header />");
    const seasonalExperience = page.indexOf("<SeasonalEventExperience", header);
    const main = page.indexOf("<main", seasonalExperience);

    expect(header).toBeGreaterThan(-1);
    expect(seasonalExperience).toBeGreaterThan(header);
    expect(main).toBeGreaterThan(seasonalExperience);
    expect(page).toContain("organizationId={organization?.id}");
  });

  it("mounts the Custom Event dialog with explicit occurrence and sale-window controls", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/brandflow/events/EventsPage.tsx"),
      "utf8",
    );

    expect(source).toContain("setEditingEvent(null); setCustomDialogOpen(true)");
    expect(source).toContain("<CustomEventDialog");
    expect(source).toContain("open={customDialogOpen}");
    expect(source).toContain(">Event Date</Label>");
    expect(source).toContain(">Sale Starts</Label>");
    expect(source).toContain(">Sale Ends</Label>");
    expect(source).toContain('<option value="automatic">Automatic by dates</option>');
    expect(source).toContain('<option value="manual">Manual control</option>');
    expect(source).toContain('event ? "" : today');
  });

  it("keeps the dialog open after a failed save and only closes after success", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/brandflow/events/EventsPage.tsx"),
      "utf8",
    );

    expect(source).toMatch(/if \(!response\.ok\) throw new Error/);
    expect(source).toContain("return false;");
    expect(source).toContain("if (saved) onClose();");
  });
});
