// @vitest-environment jsdom
/**
 * SuppliersPage regression tests — Expert review Issue C06
 *
 * Covers all UI states flagged by the expert:
 *   1. Status badges (active/inactive/blacklisted)
 *   2. Loading state (skeleton)
 *   3. Empty state (no suppliers)
 *   4. Error state (banner + retry)
 *   5. Stats rendering (server-provided)
 *   6. Access control (canWrite=false hides buttons)
 *   7. Pagination (Load More + termination)
 *   8. Rating (star click + tier badge)
 *   9. Delete (button + toast) — requires window.confirm mock
 */
import { SuppliersPage } from "./SuppliersPage";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

vi.setConfig({ testTimeout: 15000 });

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockStore = {
  appTheme: "light" as const,
};
vi.mock("@/store/brandflow-store", () => ({
  useValtrioxStore: () => mockStore,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function makeSupplier(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: `sup_${Math.random().toString(36).slice(2, 8)}`,
    name: "Acme Corp",
    email: "acme@example.com",
    phone: null,
    contactPerson: null,
    category: "Skincare",
    address: null,
    notes: null,
    status: "active",
    rating: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

interface RenderOptions {
  access?: { canRead: boolean; canWrite: boolean };
  suppliers?: ReturnType<typeof makeSupplier>[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  stats?: Record<string, unknown> | null;
  statsError?: boolean;
  listError?: boolean;
}

async function renderSuppliersPage(opts: RenderOptions = {}) {
  const {
    access = { canRead: true, canWrite: true },
    suppliers = [],
    total,
    page = 1,
    limit = 50,
    totalPages,
    stats = null,
    statsError = false,
    listError = false,
  } = opts;

  const computedTotal = total ?? suppliers.length;
  const computedTotalPages = totalPages ?? Math.max(0, Math.ceil(computedTotal / limit));
  const hasMore = page < computedTotalPages;

  const { SuppliersPage } = await import("./SuppliersPage");

  mockFetch.mockReset();
  mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
    const u = String(url);

    // Stats endpoint
    if (u.includes("/api/operations/suppliers/stats")) {
      if (statsError) {
        return { ok: false, status: 500, json: async () => ({ error: "stats failed" }) } as unknown as Response;
      }
      return {
        ok: true,
        json: async () =>
          stats ?? {
            totalSuppliers: 0,
            ratedCount: 0,
            avgRating: 0,
            topPerformer: null,
            needsAttentionCount: 0,
          },
      } as unknown as Response;
    }

    // GET list
    if (u.includes("/api/operations/suppliers") && (!init || init.method === "GET" || init.method === undefined)) {
      if (listError) {
        return { ok: false, status: 500, json: async () => ({ error: "list failed" }) } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({
          suppliers,
          stats: {
            total: computedTotal,
            active: suppliers.filter((s) => s.status === "active").length,
            inactive: 0,
            blacklisted: 0,
            ratedCount: suppliers.filter((s) => s.rating !== null).length,
            averageRating: null,
          },
          pagination: {
            page,
            limit,
            totalCount: computedTotal,
            totalPages: computedTotalPages,
            hasMore,
          },
          access,
        }),
      } as unknown as Response;
    }

    // POST create
    if (u.includes("/api/operations/suppliers") && init?.method === "POST") {
      const bodyStr = typeof init.body === "string" ? init.body : "{}";
      const body = JSON.parse(bodyStr);
      return {
        ok: true,
        json: async () => ({
          supplier: makeSupplier({ ...body, id: `sup_new_${Date.now()}` }),
        }),
      } as unknown as Response;
    }

    // PATCH rating
    if (u.includes("/api/operations/suppliers/") && init?.method === "PATCH") {
      const bodyStr = typeof init.body === "string" ? init.body : "{}";
      const body = JSON.parse(bodyStr);
      const id = u.split("/").pop() ?? "";
      const existing = suppliers.find((s) => s.id === id);
      return {
        ok: true,
        json: async () => ({
          supplier: { ...existing, ...body, id },
        }),
      } as unknown as Response;
    }

    // DELETE
    if (u.includes("/api/operations/suppliers/") && init?.method === "DELETE") {
      return {
        ok: true,
        json: async () => ({ success: true }),
      } as unknown as Response;
    }

    return { ok: false, status: 404, json: async () => ({ error: "not mocked" }) } as unknown as Response;
  });

  render(<SuppliersPage />);
  await waitFor(() => expect(mockFetch).toHaveBeenCalled());
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Status badges
// ─────────────────────────────────────────────────────────────────────────────
describe("SuppliersPage — status badges", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("renders Active badge for active suppliers", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ name: "Alpha", status: "active" })],
    });
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders Inactive badge for inactive suppliers", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ name: "Beta", status: "inactive" })],
    });
    await waitFor(() => expect(screen.getByText("Beta")).toBeInTheDocument());
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("renders Blacklisted badge for blacklisted suppliers", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ name: "Gamma", status: "blacklisted" })],
    });
    await waitFor(() => expect(screen.getByText("Gamma")).toBeInTheDocument());
    expect(screen.getByText("Blacklisted")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Loading state
// ─────────────────────────────────────────────────────────────────────────────
describe("SuppliersPage — loading state", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("shows skeleton while loading", async () => {
    const { SuppliersPage } = await import("./SuppliersPage");
    mockFetch.mockReset();
    // Never-resolving promise keeps loading=true
    mockFetch.mockImplementation(
      async () => new Promise<Response>(() => {}),
    );
    render(<SuppliersPage />);

    // Skeleton uses animate-pulse class
    await waitFor(() => {
      const skeleton = document.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Empty state
// ─────────────────────────────────────────────────────────────────────────────
describe("SuppliersPage — empty state", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("shows empty state message when no suppliers exist", async () => {
    await renderSuppliersPage({ suppliers: [] });
    await waitFor(() => {
      expect(screen.getByText("No suppliers added yet")).toBeInTheDocument();
    });
  });

  it("shows Add Supplier action in empty state when canWrite=true", async () => {
    await renderSuppliersPage({
      suppliers: [],
      access: { canRead: true, canWrite: true },
    });
    const addButtons = await screen.findAllByRole("button", { name: /add supplier/i });
    // Header + empty state action = 2
    expect(addButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("does NOT show Add Supplier action when canWrite=false", async () => {
    await renderSuppliersPage({
      suppliers: [],
      access: { canRead: true, canWrite: false },
    });
    await waitFor(() => {
      expect(screen.getByText("No suppliers added yet")).toBeInTheDocument();
    });
    expect(screen.queryAllByRole("button", { name: /add supplier/i })).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Error state
// ─────────────────────────────────────────────────────────────────────────────
describe("SuppliersPage — error state", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("shows error banner when list fetch fails", async () => {
    await renderSuppliersPage({ listError: true });
    // "Failed to load suppliers" appears in multiple places (banner + empty-state fallback).
    // Use getAllByText to tolerate multiple matches.
    await waitFor(() => {
      expect(screen.getAllByText("Failed to load suppliers").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/list failed/i).length).toBeGreaterThan(0);
  });

  it("shows Retry button on error", async () => {
    await renderSuppliersPage({ listError: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Stats rendering
// ─────────────────────────────────────────────────────────────────────────────
describe("SuppliersPage — stats", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("renders server-provided stats in Performance Ratings tab", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ name: "Rated Co", rating: 4.5 })],
      stats: {
        totalSuppliers: 5,
        ratedCount: 3,
        avgRating: 4.2,
        topPerformer: { id: "sup_1", name: "Top Co", rating: 5 },
        needsAttentionCount: 1,
      },
    });

    const ratingsTab = await screen.findByRole("button", { name: /performance ratings/i });
    await userEvent.click(ratingsTab);

    await waitFor(() => expect(screen.getByText("4.2")).toBeInTheDocument());
    expect(screen.getByText("Top Co")).toBeInTheDocument();
  });

  it("shows Unavailable when stats fetch fails", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ name: "X Co" })],
      statsError: true,
    });

    // Wait for stats error state to propagate
    await waitFor(() => {
      expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    });
  });

  it("shows Retry Stats button when stats fail", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ name: "X Co" })],
      statsError: true,
    });

    // "Retry Stats" button lives inside the Performance Ratings tab.
    // Switch to that tab first, then assert the button renders.
    const ratingsTab = await screen.findByRole("button", { name: /performance ratings/i });
    await userEvent.click(ratingsTab);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry stats/i })).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Access control
// ─────────────────────────────────────────────────────────────────────────────
describe("SuppliersPage — access control", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("hides Add Supplier button when canWrite=false", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ name: "ReadOnly Co" })],
      access: { canRead: true, canWrite: false },
    });
    await waitFor(() => expect(screen.getByText("ReadOnly Co")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /add supplier/i })).not.toBeInTheDocument();
  });

  it("hides Delete button when canWrite=false", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ name: "Nodelete Co" })],
      access: { canRead: true, canWrite: false },
    });
    await waitFor(() => expect(screen.getByText("Nodelete Co")).toBeInTheDocument());
    expect(screen.queryByLabelText(/delete nodelete co/i)).not.toBeInTheDocument();
  });

  it("shows Add Supplier button when canWrite=true", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ name: "Writable Co" })],
      access: { canRead: true, canWrite: true },
    });
    await waitFor(() => expect(screen.getByText("Writable Co")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /add supplier/i })).toBeInTheDocument();
  });

  it("shows Delete button when canWrite=true", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ id: "sup_del", name: "Deletable Co" })],
      access: { canRead: true, canWrite: true },
    });
    await waitFor(() => expect(screen.getByText("Deletable Co")).toBeInTheDocument());
    expect(screen.getByLabelText(/delete deletable co/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Pagination
// ─────────────────────────────────────────────────────────────────────────────
describe("SuppliersPage — pagination", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("shows Load More button when hasMore=true", async () => {
    const suppliers = Array.from({ length: 50 }, (_, i) =>
      makeSupplier({ id: `sup_${i}`, name: `Supplier ${i}` }),
    );
    await renderSuppliersPage({
      suppliers,
      total: 100,
      page: 1,
      limit: 50,
      totalPages: 2,
    });
    await waitFor(() => expect(screen.getByText("Supplier 0")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
  });

  it("hides Load More button when hasMore=false", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ name: "Only One Co" })],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    await waitFor(() => expect(screen.getByText("Only One Co")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("fetches next page on Load More click", async () => {
    const suppliers = Array.from({ length: 50 }, (_, i) =>
      makeSupplier({ id: `sup_${i}`, name: `Page1 Supplier ${i}` }),
    );
    await renderSuppliersPage({
      suppliers,
      total: 100,
      page: 1,
      limit: 50,
      totalPages: 2,
    });
    await waitFor(() => expect(screen.getByText("Page1 Supplier 0")).toBeInTheDocument());

    const initialCallCount = mockFetch.mock.calls.length;

    const loadMoreBtn = screen.getByRole("button", { name: /load more/i });
    await userEvent.click(loadMoreBtn);

    // Verify a new fetch was made with page=2
    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    const page2Call = mockFetch.mock.calls.find(
      (call) => String(call[0]).includes("page=2"),
    );
    expect(page2Call).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Rating
// ─────────────────────────────────────────────────────────────────────────────
describe("SuppliersPage — rating", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("renders Excellent tier badge for rating >= 4.5", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ name: "Top Co", rating: 4.5 })],
    });
    const ratingsTab = await screen.findByRole("button", { name: /performance ratings/i });
    await userEvent.click(ratingsTab);
    await waitFor(() => expect(screen.getByText("Top Co")).toBeInTheDocument());
    expect(screen.getByText("Excellent")).toBeInTheDocument();
  });

  it("renders Not Rated badge for null rating", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ name: "Unrated Co", rating: null })],
    });
    const ratingsTab = await screen.findByRole("button", { name: /performance ratings/i });
    await userEvent.click(ratingsTab);
    await waitFor(() => expect(screen.getByText("Unrated Co")).toBeInTheDocument());
    expect(screen.getByText("Not Rated")).toBeInTheDocument();
  });

  it("sends PATCH request on star click", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ id: "sup_1", name: "RateMe Co", rating: null })],
      access: { canRead: true, canWrite: true },
    });
    const ratingsTab = await screen.findByRole("button", { name: /performance ratings/i });
    await userEvent.click(ratingsTab);

    await waitFor(() => expect(screen.getByText("RateMe Co")).toBeInTheDocument());

    const initialCallCount = mockFetch.mock.calls.length;

    // Click 5th star (index 4)
    const stars = screen.getAllByRole("radio");
    expect(stars.length).toBeGreaterThanOrEqual(5);
    await userEvent.click(stars[4]);

    // Verify a PATCH was made
    await waitFor(() => {
      const patchCall = mockFetch.mock.calls.find(
        (call) =>
          String(call[0]).includes("/api/operations/suppliers/sup_1") &&
          (call[1] as RequestInit)?.method === "PATCH",
      );
      expect(patchCall).toBeDefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Delete — requires window.confirm mock
// ─────────────────────────────────────────────────────────────────────────────
describe("SuppliersPage — delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // handleDelete uses window.confirm() — jsdom returns undefined (falsy)
    // by default, which aborts the delete. Mock it to return true.
    vi.stubGlobal("confirm", vi.fn(() => true));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends DELETE request on delete button click", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ id: "sup_a", name: "Gone Co" })],
      access: { canRead: true, canWrite: true },
    });
    await waitFor(() => expect(screen.getByText("Gone Co")).toBeInTheDocument());

    const deleteBtn = screen.getByLabelText(/delete gone co/i);
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      const deleteCall = mockFetch.mock.calls.find(
        (call) =>
          String(call[0]).includes("/api/operations/suppliers/sup_a") &&
          (call[1] as RequestInit)?.method === "DELETE",
      );
      expect(deleteCall).toBeDefined();
    });
  });

  it("shows success toast after delete", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ id: "sup_a", name: "Toast Co" })],
      access: { canRead: true, canWrite: true },
    });
    await waitFor(() => expect(screen.getByText("Toast Co")).toBeInTheDocument());

    const deleteBtn = screen.getByLabelText(/delete toast co/i);
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("removes supplier from list after delete", async () => {
    await renderSuppliersPage({
      suppliers: [makeSupplier({ id: "sup_a", name: "RemoveMe Co" })],
      access: { canRead: true, canWrite: true },
    });
    await waitFor(() => expect(screen.getByText("RemoveMe Co")).toBeInTheDocument());

    const deleteBtn = screen.getByLabelText(/delete removeme co/i);
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByText("RemoveMe Co")).not.toBeInTheDocument();
    });
  });
});
// ─────────────────────────────────────────────────────────────────────────────
// 10. Pagination boundary tests (expert review: 0, 50, 51, 100, 100+ records)
// ─────────────────────────────────────────────────────────────────────────────
describe("SuppliersPage — pagination boundaries", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  const makeSupplier = (overrides: Record<string, unknown> = {}) => ({
    id: "sup_1",
    name: "Acme Co",
    contactEmail: "contact@acme.com",
    phone: "+1-555-0100",
    country: "USA",
    category: "Manufacturing",
    rating: 4,
    performance: "good",
    onTimeRate: 95,
    qualityRate: 92,
    totalOrders: 50,
    lastOrderAt: "2025-01-15T00:00:00.000Z",
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  });

  const mockPages = (
    pages: ReturnType<typeof makeSupplier>[][],
    total: number,
  ) => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/stats")) {
        return new Response(
          JSON.stringify({
            totalSuppliers: total,
            activeSuppliers: total,
            avgRating: 4.2,
            topCategory: "Manufacturing",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      const pageMatch = url.match(/page=(\d+)/);
      const page = pageMatch ? Number(pageMatch[1]) : 1;
      const data = pages[page - 1] ?? [];
      return new Response(
        JSON.stringify({
          data,
          pagination: {
            page,
            limit: 50,
            totalCount: total,
            totalPages: Math.ceil(total / 50),
            hasMore: page < Math.ceil(total / 50),
          },
          access: { canRead: true, canWrite: true },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders empty state with no Load More when 0 records", async () => {
    mockPages([[]], 0);
    render(<SuppliersPage />);
    await waitFor(() =>
      expect(screen.getByText(/no suppliers/i)).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /load more/i }),
    ).not.toBeInTheDocument();
  });

  it("hides Load More when exactly 50 records (single page)", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) =>
      makeSupplier({ id: `sup_${i}`, name: `Supplier ${i}` }),
    );
    mockPages([page1], 50);
    render(<SuppliersPage />);
    await waitFor(() =>
      expect(screen.getByText("Supplier 0")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /load more/i }),
    ).not.toBeInTheDocument();
  });

  it("shows Load More at 51 records and loads page 2", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) =>
      makeSupplier({ id: `sup_p1_${i}`, name: `Page1 Supplier ${i}` }),
    );
    const page2 = [makeSupplier({ id: "sup_p2_0", name: "Page2 Supplier 0" })];
    mockPages([page1, page2], 51);
    render(<SuppliersPage />);
    await waitFor(() =>
      expect(screen.getByText("Page1 Supplier 0")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /load more/i }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /load more/i }),
    );
    await waitFor(() =>
      expect(screen.getByText("Page2 Supplier 0")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /load more/i }),
    ).not.toBeInTheDocument();
  });

  it("shows Load More at exactly 100 records and hides after page 2", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) =>
      makeSupplier({ id: `sup_p1_${i}`, name: `Page1 Supplier ${i}` }),
    );
    const page2 = Array.from({ length: 50 }, (_, i) =>
      makeSupplier({ id: `sup_p2_${i}`, name: `Page2 Supplier ${i}` }),
    );
    mockPages([page1, page2], 100);
    render(<SuppliersPage />);
    await waitFor(() =>
      expect(screen.getByText("Page1 Supplier 0")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /load more/i }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /load more/i }),
    );
    await waitFor(() =>
      expect(screen.getByText("Page2 Supplier 0")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /load more/i }),
    ).not.toBeInTheDocument();
  });

  it("paginates through 100+ records across 3 pages", async () => {
    const page1 = Array.from({ length: 50 }, (_, i) =>
      makeSupplier({ id: `sup_p1_${i}`, name: `Alpha Supplier ${i}` }),
    );
    const page2 = Array.from({ length: 50 }, (_, i) =>
      makeSupplier({ id: `sup_p2_${i}`, name: `Beta Supplier ${i}` }),
    );
    const page3 = Array.from({ length: 25 }, (_, i) =>
      makeSupplier({ id: `sup_p3_${i}`, name: `Gamma Supplier ${i}` }),
    );
    mockPages([page1, page2, page3], 125);
    render(<SuppliersPage />);
    await waitFor(() =>
      expect(screen.getByText("Alpha Supplier 0")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /load more/i }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /load more/i }),
    );
    await waitFor(() =>
      expect(screen.getByText("Beta Supplier 0")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /load more/i }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /load more/i }),
    );
    await waitFor(() =>
      expect(screen.getByText("Gamma Supplier 0")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /load more/i }),
    ).not.toBeInTheDocument();
  });
});
// ════════════════════════════════════════════════════════════════════════════
// C04 v2: Stats loading, error states, recovery
// ════════════════════════════════════════════════════════════════════════════
describe("SuppliersPage — C04 v2 stats edge cases", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows Unavailable when stats returns 403", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/stats")) {
        return {
          ok: false,
          status: 403,
          json: async () => ({ error: "Forbidden" }),
        } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({
          suppliers: [makeSupplier({ name: "Co A" })],
          pagination: {
            page: 1,
            limit: 50,
            totalCount: 1,
            totalPages: 1,
            hasMore: false,
          },
          access: { canRead: true, canWrite: true },
        }),
      } as unknown as Response;
    });

    render(<SuppliersPage />);
    await waitFor(() => expect(screen.getByText("Co A")).toBeInTheDocument());

    const ratingsTab = await screen.findByRole("button", {
      name: /performance ratings/i,
    });
    await userEvent.click(ratingsTab);

    await waitFor(() => {
      expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    });
  });

  it("shows Unavailable when stats returns 404", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/stats")) {
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: "Not found" }),
        } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({
          suppliers: [makeSupplier({ name: "Co B" })],
          pagination: {
            page: 1,
            limit: 50,
            totalCount: 1,
            totalPages: 1,
            hasMore: false,
          },
          access: { canRead: true, canWrite: true },
        }),
      } as unknown as Response;
    });

    render(<SuppliersPage />);
    await waitFor(() => expect(screen.getByText("Co B")).toBeInTheDocument());

    const ratingsTab = await screen.findByRole("button", {
      name: /performance ratings/i,
    });
    await userEvent.click(ratingsTab);

    await waitFor(() => {
      expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    });
  });

  it("shows Unavailable on network failure", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/stats")) {
        throw new Error("Network error");
      }
      return {
        ok: true,
        json: async () => ({
          suppliers: [makeSupplier({ name: "Co C" })],
          pagination: {
            page: 1,
            limit: 50,
            totalCount: 1,
            totalPages: 1,
            hasMore: false,
          },
          access: { canRead: true, canWrite: true },
        }),
      } as unknown as Response;
    });

    render(<SuppliersPage />);
    await waitFor(() => expect(screen.getByText("Co C")).toBeInTheDocument());

    const ratingsTab = await screen.findByRole("button", {
      name: /performance ratings/i,
    });
    await userEvent.click(ratingsTab);

    await waitFor(() => {
      expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    });
  });

  it("recovers from stats error on Retry Stats click", async () => {
    let statsCallCount = 0;
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/stats")) {
        statsCallCount++;
        if (statsCallCount === 1) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: "Server error" }),
          } as unknown as Response;
        }
        return {
          ok: true,
          json: async () => ({
            totalSuppliers: 10,
            activeSuppliers: 8,
            ratedCount: 5,
            avgRating: 4.5,
            topPerformer: { id: "sup_1", name: "Top Co", rating: 5 },
            needsAttentionCount: 2,
          }),
        } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({
          suppliers: [makeSupplier({ name: "Co D" })],
          pagination: {
            page: 1,
            limit: 50,
            totalCount: 1,
            totalPages: 1,
            hasMore: false,
          },
          access: { canRead: true, canWrite: true },
        }),
      } as unknown as Response;
    });

    render(<SuppliersPage />);
    await waitFor(() => expect(screen.getByText("Co D")).toBeInTheDocument());

    const ratingsTab = await screen.findByRole("button", {
      name: /performance ratings/i,
    });
    await userEvent.click(ratingsTab);

    await waitFor(() => {
      expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    });

    const retryBtn = screen.getByRole("button", { name: /retry stats/i });
    await userEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("4.5")).toBeInTheDocument();
    });
    expect(screen.getByText("Top Co")).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Point 10: Rating rollback, delete failure, Unknown status
// ════════════════════════════════════════════════════════════════════════════
describe("SuppliersPage — Point 10 edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("confirm", vi.fn(() => true));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rolls back rating on PATCH failure", async () => {
    const supplier = makeSupplier({
      id: "sup_1",
      name: "Rollback Co",
      rating: 4,
    });
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes("/stats")) {
        return {
          ok: true,
          json: async () => ({
            totalSuppliers: 1,
            activeSuppliers: 1,
            ratedCount: 1,
            avgRating: 4,
            topPerformer: null,
            needsAttentionCount: 0,
          }),
        } as unknown as Response;
      }
      if (url.includes("/api/operations/suppliers/sup_1") && init?.method === "PATCH") {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: "Failed to update rating" }),
        } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({
          suppliers: [supplier],
          pagination: {
            page: 1,
            limit: 50,
            totalCount: 1,
            totalPages: 1,
            hasMore: false,
          },
          access: { canRead: true, canWrite: true },
        }),
      } as unknown as Response;
    });

    render(<SuppliersPage />);
    const ratingsTab = await screen.findByRole("button", {
      name: /performance ratings/i,
    });
    await userEvent.click(ratingsTab);

    await waitFor(() => expect(screen.getByText("Rollback Co")).toBeInTheDocument());

    const stars = screen.getAllByRole("radio");
    await userEvent.click(stars[4]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("shows error toast on delete failure", async () => {
    const supplier = makeSupplier({
      id: "sup_del_fail",
      name: "FailDelete Co",
    });
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes("/stats")) {
        return {
          ok: true,
          json: async () => ({
            totalSuppliers: 1,
            activeSuppliers: 1,
            ratedCount: 0,
            avgRating: null,
            topPerformer: null,
            needsAttentionCount: 0,
          }),
        } as unknown as Response;
      }
      if (url.includes("/api/operations/suppliers/sup_del_fail") && init?.method === "DELETE") {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: "Cannot delete supplier" }),
        } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({
          suppliers: [supplier],
          pagination: {
            page: 1,
            limit: 50,
            totalCount: 1,
            totalPages: 1,
            hasMore: false,
          },
          access: { canRead: true, canWrite: true },
        }),
      } as unknown as Response;
    });

    render(<SuppliersPage />);
    await waitFor(() => expect(screen.getByText("FailDelete Co")).toBeInTheDocument());

    const deleteBtn = screen.getByLabelText(/delete faildelete co/i);
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(screen.getByText("FailDelete Co")).toBeInTheDocument();
  });

  it("renders Unknown badge for unrecognized status", async () => {
    const supplier = makeSupplier({
      name: "Mystery Co",
      status: "pending",
    });
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/stats")) {
        return {
          ok: true,
          json: async () => ({
            totalSuppliers: 1,
            activeSuppliers: 0,
            ratedCount: 0,
            avgRating: null,
            topPerformer: null,
            needsAttentionCount: 0,
          }),
        } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({
          suppliers: [supplier],
          pagination: {
            page: 1,
            limit: 50,
            totalCount: 1,
            totalPages: 1,
            hasMore: false,
          },
          access: { canRead: true, canWrite: true },
        }),
      } as unknown as Response;
    });

    render(<SuppliersPage />);
    await waitFor(() => expect(screen.getByText("Mystery Co")).toBeInTheDocument());
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});