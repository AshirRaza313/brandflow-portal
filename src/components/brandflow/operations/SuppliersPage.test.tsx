// @vitest-environment jsdom
/**
 * SuppliersPage component tests — Sub-Issue #5 verification
 *
 * Verifies the UI allows creating a Supplier WITHOUT an email (backend Zod
 * schema already accepts optional/null/empty email).
 *
 * Test matrix (per expert review):
 *   1. Create with only name → success, payload email = null
 *   2. email: "" → success, normalized to null
 *   3. whitespace-only email ("   ") → treated as blank → null
 *   4. valid email normalization (trim + lowercase)
 *   5. invalid email rejection (toast error, no submit)
 *   6. no "Contact email is required" error shown
 *   7. created Supplier renders in the list
 *   8. label shows "Contact Email (Optional)"
 *
 * Point 7: Updated to new API contract (pagination object + access shape).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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

let lastPostBody: Record<string, unknown> | null = null;
let postCallCount = 0;

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ─────────────────────────────────────────────────────────────────────────────
// Helper — render with an empty initial supplier list
// Point 7: Updated mock to new API contract with pagination object + access
// ─────────────────────────────────────────────────────────────────────────────
async function renderSuppliersPage() {
  const { SuppliersPage } = await import("./SuppliersPage");

  mockFetch.mockReset();
  lastPostBody = null;
  postCallCount = 0;

  mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
    const u = String(url);

    // Stats endpoint — Point 7: new stats shape (avgRating, not averageRating)
    if (u.includes("/api/operations/suppliers/stats")) {
      return {
        ok: true,
        json: async () => ({
          totalSuppliers: 0,
          ratedCount: 0,
          avgRating: null,
          topPerformer: null,
          needsAttentionCount: 0,
          access: { canRead: true, canWrite: true },
        }),
      } as unknown as Response;
    }

    // GET list — Point 7: new pagination object shape
    if (u.includes("/api/operations/suppliers") && (!init || init.method === "GET" || init.method === undefined)) {
      return {
        ok: true,
        json: async () => ({
          suppliers: [],
          pagination: {
            page: 1,
            limit: 50,
            totalCount: 0,
            totalPages: 0,
            hasMore: false,
          },
          access: { canRead: true, canWrite: true },
        }),
      } as unknown as Response;
    }

    // POST create
    if (u.includes("/api/operations/suppliers") && init?.method === "POST") {
      postCallCount += 1;
      const bodyStr = typeof init.body === "string" ? init.body : "";
      lastPostBody = JSON.parse(bodyStr);
      return {
        ok: true,
        json: async () => ({
          supplier: {
            id: `sup_${postCallCount}`,
            name: lastPostBody?.name,
            email: lastPostBody?.email ?? null,
            phone: lastPostBody?.phone ?? null,
            contactPerson: null,
            category: lastPostBody?.category ?? null,
            address: lastPostBody?.address ?? null,
            status: "active",
            rating: null,
            createdAt: new Date().toISOString(),
          },
        }),
      } as unknown as Response;
    }

    return { ok: false, status: 404, json: async () => ({ error: "not mocked" }) } as unknown as Response;
  });

  render(<SuppliersPage />);
  await waitFor(() => expect(mockFetch).toHaveBeenCalled());
}

async function openAddDialog() {
  const addButtons = await screen.findAllByRole("button", { name: /add supplier/i });
  await userEvent.click(addButtons[0]);
  await screen.findByRole("dialog");
}

async function fillName(name: string) {
  const nameInput = await screen.findByPlaceholderText(/enter supplier name/i);
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, name);
}

async function fillEmail(email: string) {
  const emailInput = await screen.findByPlaceholderText(/email@example\.com/i);
  await userEvent.clear(emailInput);
  if (email !== "") {
    await userEvent.type(emailInput, email);
  }
}

async function submitForm() {
  const dialog = await screen.findByRole("dialog");
  const submitBtn = within(dialog).getByRole("button", { name: /add supplier/i });
  await userEvent.click(submitBtn);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────
describe("SuppliersPage — optional contact email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastPostBody = null;
    postCallCount = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a supplier with only a name (email left blank)", async () => {
    await renderSuppliersPage();
    await openAddDialog();
    await fillName("Acme Corp");
    await submitForm();

    await waitFor(() => {
      expect(lastPostBody).not.toBeNull();
    });
    expect(lastPostBody?.name).toBe("Acme Corp");
    expect(lastPostBody?.email).toBeNull();
    expect(toast.success).toHaveBeenCalledWith("Supplier added successfully!");
  });

  it("creates a supplier when email field is empty string", async () => {
    await renderSuppliersPage();
    await openAddDialog();
    await fillName("Beta LLC");
    await fillEmail("");
    await submitForm();

    await waitFor(() => expect(lastPostBody).not.toBeNull());
    expect(lastPostBody?.email).toBeNull();
  });

  it("treats whitespace-only email as blank and sends null", async () => {
    await renderSuppliersPage();
    await openAddDialog();
    await fillName("Gamma Inc");
    await fillEmail("     ");
    await submitForm();

    await waitFor(() => expect(lastPostBody).not.toBeNull());
    expect(lastPostBody?.email).toBeNull();
    expect(toast.error).not.toHaveBeenCalledWith("Contact email is required");
  });

  it("normalizes a valid email (trim + lowercase)", async () => {
    await renderSuppliersPage();
    await openAddDialog();
    await fillName("Delta Co");
    await fillEmail("  SALES@DELTA.COM  ");
    await submitForm();

    await waitFor(() => expect(lastPostBody).not.toBeNull());
    expect(lastPostBody?.email).toBe("sales@delta.com");
  });

  it("rejects an invalid email and does not submit", async () => {
    await renderSuppliersPage();
    await openAddDialog();
    await fillName("Epsilon Ltd");
    await fillEmail("not-an-email");
    await submitForm();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid email format");
    });
    expect(lastPostBody).toBeNull();
  });

  it("does NOT show the old 'Contact email is required' error", async () => {
    await renderSuppliersPage();
    await openAddDialog();
    await fillName("Zeta Corp");
    await submitForm();

    await waitFor(() => expect(lastPostBody).not.toBeNull());
    expect(toast.error).not.toHaveBeenCalledWith("Contact email is required");
  });

  it("renders the created supplier in the list after success", async () => {
    await renderSuppliersPage();
    await openAddDialog();
    await fillName("Acme Corp");
    await submitForm();

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
  });

  it("displays the field label as 'Contact Email (Optional)'", async () => {
    await renderSuppliersPage();
    await openAddDialog();
    await waitFor(() => {
      expect(screen.getByText(/contact email/i)).toBeInTheDocument();
    });
    const label = screen.getByText(/contact email/i);
    expect(label.textContent?.toLowerCase()).toContain("optional");
  });
});