// ============================================================================
// Authenticated Fetch Utility
// ============================================================================
// Wraps native fetch() to automatically inject authentication headers from
// the Zustand store (localStorage). This ensures ALL API calls include auth
// context even if cookies/middleware fail.
//
// Usage:
//   import { fetchWithAuth } from "@/lib/fetch-with-auth";
//   const res = await fetchWithAuth("/api/dashboard/stats?orgId=xxx");
//
// Works identically to native fetch — same signature, same return type.
// ============================================================================

/**
 * Read auth data from localStorage (same keys as brandflow-store.ts).
 * Returns null if not logged in.
 * Includes auto-migration from legacy keys (brandflow-*, brandforge-*) → brandonix-*
 */
function migrateLegacyKeys() {
  try {
    if (typeof window === "undefined") return;
    const legacyPrefixes = ["brandforge", "brandflow"];
    const newPrefix = "brandonix";
    const keySuffixes = ["-user", "-org", "-brandname", "-logo", "-tagline", "-configured", "-theme", "-language", "-appTheme"];
    for (const oldPrefix of legacyPrefixes) {
      for (const suffix of keySuffixes) {
        const oldKey = `${oldPrefix}${suffix}`;
        const newKey = `${newPrefix}${suffix}`;
        if (localStorage.getItem(oldKey) && !localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, localStorage.getItem(oldKey)!);
          localStorage.removeItem(oldKey);
        }
      }
      // Also migrate chat/support/call/skipped keys
      const extraKeys = ["-chat-messages", "-support-chat", "-call-logs", "-skipped-setup"];
      for (const suffix of extraKeys) {
        const oldKey = `${oldPrefix}${suffix}`;
        const newKey = `${newPrefix}${suffix}`;
        if (localStorage.getItem(oldKey) && !localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, localStorage.getItem(oldKey)!);
          localStorage.removeItem(oldKey);
        }
      }
    }
  } catch { /* silent */ }
}
function getAuthFromStorage(): { userId: string; email: string; role: string; orgId: string } | null {
  try {
    if (typeof window === "undefined") return null;
    migrateLegacyKeys();
    const userStr = localStorage.getItem("brandonix-user");
    const orgStr = localStorage.getItem("brandonix-org");
    if (!userStr) return null;

    const user = JSON.parse(userStr);
    const org = orgStr ? JSON.parse(orgStr) : null;

    if (!user?.id) return null;

    return {
      userId: user.id,
      email: user.email || "",
      role: user.role || "member",
      orgId: org?.id || "",
    };
  } catch {
    return null;
  }
}

/**
 * Authenticated fetch — identical API to native fetch() but auto-injects
 * auth headers from localStorage.
 *
 * The auth headers are only added if they don't already exist on the request
 * (allows manual override if needed).
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const auth = getAuthFromStorage();

  // If user is not logged in, just do a normal fetch
  if (!auth) {
    return fetch(input, init);
  }

  // Merge auth headers into the request
  const headers = new Headers(init?.headers);

  if (!headers.has("X-User-Id")) {
    headers.set("X-User-Id", auth.userId);
  }
  if (!headers.has("X-User-Email")) {
    headers.set("X-User-Email", auth.email);
  }
  if (!headers.has("X-User-Role")) {
    headers.set("X-User-Role", auth.role);
  }
  if (!headers.has("X-Org-Id")) {
    headers.set("X-Org-Id", auth.orgId);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

/**
 * Get auth headers as a plain object (for use with external libraries
 * that accept headers as objects rather than Headers instances).
 */
export function getAuthHeaders(): Record<string, string> {
  const auth = getAuthFromStorage();
  if (!auth) return {};

  return {
    "X-User-Id": auth.userId,
    "X-User-Email": auth.email,
    "X-User-Role": auth.role,
    "X-Org-Id": auth.orgId,
  };
}
