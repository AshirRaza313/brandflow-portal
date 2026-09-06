// ============================================================================
// Authenticated Fetch Utility
// ============================================================================
// Wraps native fetch() with a 30-second timeout. Auth is handled
// automatically by httpOnly + HMAC-signed cookies sent by the browser on
// every same-origin request — no client-side auth header injection needed.
// ============================================================================

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

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

  const cleanup = () => {
    clearTimeout(timeoutId);
    if (init?.signal && onExternalAbort) {
      init.signal.removeEventListener("abort", onExternalAbort);
    }
  };

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    const bodyMethods = ["text", "json", "blob", "arrayBuffer", "formData"] as const;

    for (const method of bodyMethods) {
      if (typeof (response as any)[method] === "function") {
        const original = (response as any)[method].bind(response);
        (response as any)[method] = async (...args: any[]) => {
          try {
            return await original(...args);
          } finally {
            cleanup();
          }
        };
      }
    }

    return response;
  } catch (error: any) {
    cleanup();
    if (error?.name === "AbortError") {
      if (externalAbort) throw error;
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  }
}

export function getAuthHeaders(): Record<string, string> {
  return {};
}

