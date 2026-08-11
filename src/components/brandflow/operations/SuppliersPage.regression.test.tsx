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