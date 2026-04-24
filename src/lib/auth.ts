// In-memory token store for session management
const tokenStore = new Map<string, { adminId: string; email: string; createdAt: Date }>();

export function createToken(adminId: string, email: string): string {
  const token = `bf_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  tokenStore.set(token, { adminId, email, createdAt: new Date() });
  return token;
}

export function validateToken(token: string): { adminId: string; email: string } | null {
  const data = tokenStore.get(token);
  if (!data) return null;
  // Token expires after 24 hours
  if (Date.now() - data.createdAt.getTime() > 24 * 60 * 60 * 1000) {
    tokenStore.delete(token);
    return null;
  }
  return { adminId: data.adminId, email: data.email };
}

export function removeToken(token: string): void {
  tokenStore.delete(token);
}

export function getTokenFromRequest(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  // Check cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/auth_token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}
