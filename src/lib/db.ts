import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export async function ensureDb(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (err: any) {
    console.error("[DB] Connection failed:", err?.message);
    throw new Error(`Database connection failed: ${err?.message}`);
  }
}

export function dbErrorResponse(error: any) {
  const message = error?.message || 'Database connection failed';
  return new Response(
    JSON.stringify({ error: 'Service temporarily unavailable', details: message }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}
