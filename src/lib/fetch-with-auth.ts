// ============================================================================
// Authenticated Fetch Utility
// ============================================================================
// Wraps native fetch() with a 30-second timeout. Auth is handled
// automatically by httpOnly + HMAC-signed cookies sent by the browser on
// every same-origin request — no client-side auth header injection needed.
//
// SECURITY (Phase 17 — localStorage PII purge):
//   Previous versions read `valtriox-user` / `valtriox-org` from localStorage
//   and injected `x-user-id` / `x-user-email` / `x-user-role` / `x-org-id`
//   headers. The server's auth-middleware.ts NEVER trusted these headers
//   (see "FIX 1.2" comment in that file) — they were dead code that only
//   increased the XSS attack surface by keeping PII in localStorage.
//   All header injection has been removed. Auth flows solely through
//   signed cookies that JS cannot read.
//
// Usage:
//   import { fetchWithAuth } from "@/lib/fetch-with-auth";
//   const res = await fetchWithAuth("/api/dashboard/stats");
// ============================================================================

/**
 * Authenticated fetch — identical API to native fetch() but applies a
 * 30-second timeout to prevent hanging on slow serverless cold starts.
 *
 * Cookies (including the httpOnly auth cookie) are sent automatically by
 * the browser for same-origin requests. No manual header injection.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Add 30-second timeout to prevent hanging on slow serverless cold starts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  // Support caller-provided AbortSignal (e.g. component unmount cleanup).
  // When caller signal fires, abort internal controller too.
  let externalAbort = false;
  let onExternalAbort: (() => void) | null = null;

  if (init?.signal) {
    if (init.signal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    onExternalAbort = () => {
      externalAbort = true;
      controller.abort();
    };
    init.signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      if (externalAbort) throw error;
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    // Clean up external listener to prevent memory leaks
    if (init?.signal && onExternalAbort) {
      init.signal.removeEventListener("abort", onExternalAbort);
    }
  }
}

/**
 * Get auth headers as a plain object (for use with external libraries
 * that accept headers as objects rather than Headers instances).
 *
 * DEPRECATED (Phase 17): Auth now flows exclusively through httpOnly
 * cookies. This function always returns `{}`. Retained as a stub so
 * existing imports do not break — call sites can be cleaned up gradually.
 */
export function getAuthHeaders(): Record<string, string> {
  return {};
}
