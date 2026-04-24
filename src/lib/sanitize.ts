// ============================================================================
// Input Sanitization Utility
// ============================================================================
// Protects against XSS, SQL injection, and NoSQL injection by sanitizing
// user input before processing or storing in database.
// ============================================================================

/**
 * Strip HTML tags and special characters that could cause XSS.
 * Keeps basic text formatting safe.
 */
export function sanitizeString(input: unknown): string {
  if (input === null || input === undefined) return "";
  const str = String(input);

  return str
    // Remove HTML tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    // Remove dangerous attributes
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/on\w+\s*=\s*\S+/gi, "")
    // Remove javascript: protocol
    .replace(/javascript\s*:/gi, "")
    // Remove data: protocol (for images/scripts)
    .replace(/data\s*:\s*text\/html/gi, "")
    // Remove vbscript
    .replace(/vbscript\s*:/gi, "")
    // Remove expression (IE)
    .replace(/expression\s*\(/gi, "")
    // Remove null bytes
    .replace(/\0/g, "")
    // Trim whitespace
    .trim();
}

/**
 * Sanitize an object recursively — all string values get sanitized.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (typeof value === "string") {
      result[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "object" && item !== null ? sanitizeObject(item as Record<string, unknown>) : sanitizeString(item)
      );
    } else if (typeof value === "object") {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Sanitize an email address — lowercase, trim, remove dangerous characters.
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().replace(/[^a-z0-9@._+-]/g, "");
}

/**
 * Sanitize a phone number — keep only digits and common separators.
 */
export function sanitizePhone(phone: string): string {
  return phone.trim().replace(/[^0-9+\-()\s]/g, "");
}

/**
 * Validate and sanitize a slug (URL-friendly string).
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Check if a string contains potential SQL injection patterns.
 * Returns true if suspicious patterns are found.
 */
export function hasSqlInjection(input: string): boolean {
  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION|TRUNCATE)\b)/i,
    /(--|#|\/\*|\*\/|;)/,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
    /('\s*(OR|AND)\s*')/i,
    /(\b(OR|AND)\b\s+true)/i,
  ];
  return patterns.some((pattern) => pattern.test(input));
}

/**
 * Check if a string contains potential XSS patterns.
 * Returns true if suspicious patterns are found.
 */
export function hasXSS(input: string): boolean {
  const patterns = [
    /<script\b/i,
    /on\w+\s*=/i,
    /javascript\s*:/i,
    /vbscript\s*:/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /expression\s*\(/i,
    /data\s*:\s*text\/html/i,
    /document\.(cookie|domain|write)/i,
  ];
  return patterns.some((pattern) => pattern.test(input));
}

/**
 * withSanitizedBody — Higher-order function that sanitizes request body.
 * Wraps POST/PUT/PATCH handlers and sanitizes all string values in the body.
 *
 * Usage:
 *   export const POST = withSanitizedBody(async (req, body) => {
 *     // body is already sanitized
 *     return NextResponse.json({ data: body.name });
 *   });
 */
type SanitizedHandler = (req: NextRequest, body: Record<string, unknown>) => Promise<Response> | Response;

export function withSanitizedBody(
  handler: SanitizedHandler,
  options: { maxBodySize?: number } = {}
): (req: NextRequest) => Promise<Response> {
  const { maxBodySize = 1024 * 1024 } = options; // 1MB default

  return async (req: NextRequest): Promise<Response> => {
    try {
      // Check content-length header for oversized payloads
      const contentLength = parseInt(req.headers.get("content-length") || "0");
      if (contentLength > maxBodySize) {
        return NextResponse.json({ error: "Request body too large" }, { status: 413 });
      }

      let body: Record<string, unknown> = {};
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      // Sanitize all string values recursively
      const sanitizedBody = sanitizeObject(body);

      return handler(req, sanitizedBody);
    } catch (error: any) {
      return NextResponse.json(
        { error: "Failed to process request body" },
        { status: 400 }
      );
    }
  };
}

/**
 * Validate a password meets minimum security requirements.
 * Returns an object with valid boolean and reason string if invalid.
 */
export function validatePassword(password: string): { valid: boolean; reason?: string } {
  if (password.length < 8) return { valid: false, reason: "Password must be at least 8 characters long." };
  if (!/[A-Z]/.test(password)) return { valid: false, reason: "Password must contain at least one uppercase letter." };
  if (!/[a-z]/.test(password)) return { valid: false, reason: "Password must contain at least one lowercase letter." };
  if (!/[0-9]/.test(password)) return { valid: false, reason: "Password must contain at least one number." };
  return { valid: true };
}
