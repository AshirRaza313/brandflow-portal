// ============================================================================
// Data Isolation Helpers — Ensures all API routes filter by organizationId
// ============================================================================

/**
 * Extract organizationId from the request.
 * Checks (in order): query params → request body → x-organization-id header
 * Returns null if no orgId is found.
 */
export function getOrgId(request: Request): string | null {
  // 1. Query params
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("orgId");
  if (fromQuery) return fromQuery;

  // 2. Header
  const fromHeader = request.headers.get("x-organization-id");
  if (fromHeader) return fromHeader;

  return null;
}

/**
 * Extract organizationId from request (including body for POST/PUT/PATCH).
 * For methods with a body, it attempts to clone and parse JSON.
 * Falls back to query params and headers.
 */
export async function getOrgIdWithBody(request: Request): Promise<string | null> {
  // 1. Query params
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("orgId");
  if (fromQuery) return fromQuery;

  // 2. Header
  const fromHeader = request.headers.get("x-organization-id");
  if (fromHeader) return fromHeader;

  // 3. Body (for POST/PUT/PATCH)
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const clone = request.clone();
      const body = await clone.json();
      if (body.organizationId) return body.organizationId;
    } catch {
      // Body parse failed, ignore
    }
  }

  return null;
}

/**
 * Return a 400 error response for missing orgId
 */
export function missingOrgIdResponse() {
  return new Response(
    JSON.stringify({ error: "Organization ID required" }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Return a 404 error response for record not found or not owned by org
 */
export function notFoundOrUnauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: "Record not found" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Return a 403 error response for access denied
 */
export function accessDeniedResponse(message = "Access denied") {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}
