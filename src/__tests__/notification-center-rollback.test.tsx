// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NotificationCenter } from "@/components/brandflow/shared/NotificationCenter";

vi.mock("@/store/brandflow-store", () => ({
  useValtrioxStore: (selector?: any) => {
    if (selector) return selector({ organization: { id: "org-1" }, appTheme: "light" });
    return { organization: { id: "org-1" }, appTheme: "light", setActiveSection: vi.fn() };
  },
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => (key: string, fallback?: any) => fallback || key,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("NotificationCenter markAllRead double-failure rollback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("rolls back optimistic zero when mutation and refetch both fail", async () => {
    const fetchMock = globalThis.fetch as any;

    // Initial GET returns two unread notifications
    fetchMock.mockImplementationOnce(async () => ({
      ok: true,
      json: async () => ({
        notifications: [
          { id: "n1", title: "Test", message: "msg", type: "info", read: false, createdAt: new Date().toISOString(), userId: "user-1" },
          { id: "n2", title: "Test2", message: "msg2", type: "info", read: false, createdAt: new Date().toISOString(), userId: null },
        ],
        unreadCount: 2,
      }),
    }));

    render(<NotificationCenter />);

    // Open bell panel
    const bellButton = document.getElementById("notification-bell-btn")!;
    fireEvent.click(bellButton);

    // Wait for notifications to load
    await waitFor(() => expect(screen.getByText("Test")).toBeTruthy());

    // Set up mutation POST fail and refetch GET fail
    fetchMock.mockImplementationOnce(async () => ({ ok: false, json: async () => ({}) }));
    fetchMock.mockImplementationOnce(async () => { throw new Error("Network error"); });

    // Click mark all read (badge button)
    const markAllButtons = screen.getAllByText(/Mark all read/i);
    fireEvent.click(markAllButtons[0]);

    // Wait for rollback to 2
    await waitFor(() => {
      expect(screen.getByText("2")).toBeTruthy();
    });
  });
});

