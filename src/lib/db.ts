import { PrismaClient } from '@prisma/client'
import { Pool, PoolConfig } from 'pg'
import { NextResponse } from 'next/server'
import logger from '@/lib/logger'
import {
  classifyDatabaseError,
  isDatabaseUnavailableError,
  retryTransientDatabaseOperation,
} from '@/lib/database-errors'
import { buildPrismaUrl } from '@/lib/database-url'

/** Safely extract message and code from an unknown error */
function getErrorInfo(e: unknown): { message: string; code: string } {
  if (e && typeof e === 'object') {
    const message = 'message' in e && typeof (e as Record<string, unknown>).message === 'string' ? (e as Record<string, unknown>).message as string : String(e);
    const code = 'code' in e && typeof (e as Record<string, unknown>).code === 'string' ? (e as Record<string, unknown>).code as string : '';
    return { message, code };
  }
  return { message: String(e), code: '' };
}

/**
 * Build Prisma-compatible DATABASE_URL.
 * Appends pgbouncer=true so Prisma uses simple query protocol
 * (no prepared statements) - required when using Supabase PgBouncer
 * in transaction mode. Without this, you get error 42P05:
 * "prepared statement already exists".
 *
 * Also adds connect_timeout=15 for Vercel serverless cold starts
 * where PgBouncer pool warmup can be slow.
 */
export function getPrismaUrl(): string {
  const url = process.env.DATABASE_URL || '';
  return buildPrismaUrl(url, process.env.EXPECTED_DATABASE_PROJECT_REF);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Phase 5: Different log levels for dev vs prod
    // Dev: query + error + warn for debugging
    // Prod: error only to reduce noise
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: getPrismaUrl(),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ═══════════════════════════════════════════════════════════════════════════
//  RETRY UTILITY - handles transient Supabase/PgBouncer connection errors
// ═══════════════════════════════════════════════════════════════════════════

// Retry only known transient Prisma/network failures. Permanent authentication,
// authorization, configuration, schema, and application errors fail immediately.
/**
 * Retry a database operation with exponential backoff.
 * Use for critical queries that should survive transient PgBouncer hiccups.
 */
export async function withRetry<TResult>(
  queryFn: () => TResult,
  retries = 3,
  baseDelay = 300
): Promise<Awaited<TResult>> {
  return retryTransientDatabaseOperation(queryFn, retries, baseDelay, (event) => {
    logger.warn('[DB] Retry attempt', event);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  DIRECT DATABASE CONNECTION (bypasses PgBouncer for DDL)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Safely parse a PostgreSQL URL even when the password contains special characters.
 * `new URL()` can fail or mis-parse passwords with @, #, etc.
 * This function handles those edge cases.
 */
export function parsePgUrl(raw: string): { username: string; password: string; host: string; port: string; database: string } | null {
  if (!raw) return null;

  // Strategy 1: Standard URL parsing (works for most cases)
  try {
    const parsed = new URL(raw);
    return {
      username: decodeURIComponent(parsed.username || 'postgres'),
      password: decodeURIComponent(parsed.password || ''),
      host: parsed.hostname || '',
      port: parsed.port || '5432',
      database: (parsed.pathname || '/postgres').replace(/^\//, '') || 'postgres',
    };
  } catch {
    // Fall through to manual parsing
  }

  // Strategy 2: Manual regex parsing for tricky passwords
  // postgresql://user:pass@host:port/dbname?params
  const regex = /^postgresql:\/\/([^:@]+)(?::([^@]*))?@([^:/?#]+)(?::(\d+))?\/([^?#]+)/;
  const match = raw.match(regex);
  if (match) {
    return {
      username: match[1] || 'postgres',
      password: match[2] || '',
      host: match[3],
      port: match[4] || '5432',
      database: match[5] || 'postgres',
    };
  }

  return null;
}

/**
 * Parse a pg URL into components for manual Pool construction.
 * Avoids the SSL param conflict that occurs when using `connectionString`.
 */
export function parsePgUrlToConfig(url: string): PoolConfig | null {
  const parts = parsePgUrl(url);
  if (!parts) return null;
  return {
    host: parts.host,
    port: parseInt(parts.port) || 5432,
    database: parts.database,
    user: parts.username,
    password: parts.password,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 10000,
  };
}

/**
 * Converts ANY Supabase database URL to a direct (non-pooler) URL.
 *
 * Supported formats:
 *   Pooler (transaction): postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres
 *   Pooler (generic):     postgresql://postgres.[ref]:[pass]@[ref].pooler.supabase.com:6543/postgres
 *   Direct (already):     postgresql://postgres:[pass]@db.[ref].supabase.co:5432/postgres
 *
 * IMPORTANT: Does NOT add sslmode to the URL — SSL is handled by
 * PoolConfig.ssl when constructing the pool.
 *
 * Returns null if conversion is not possible.
 */
export function toDirectUrl(url: string): string | null {
  if (!url) return null;

  const parts = parsePgUrl(url);
  if (!parts) {
    logger.warn('[DB] toDirectUrl: could not parse URL');
    return null;
  }

  const { username, password, host, port, database } = parts;

  // Already a direct connection
  if (host.startsWith('db.') && host.includes('.supabase.co')) {
    return `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/${database}`;
  }

  // Not a Supabase URL - return as-is
  if (!host.includes('supabase')) {
    return `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:5432/${database}`;
  }

  // ── Supabase pooler URL → session-mode pooler URL ──
  // Supabase has DEPRECATED direct connections via db.{ref}.supabase.co:5432
  // from external IPs (Vercel, etc.). The DNS no longer resolves in many
  // regions, causing ENOTFOUND errors.
  //
  // The correct approach for "direct-like" queries (DDL, ALTER TABLE, etc.)
  // from external runtimes is to use the POOLER in SESSION MODE:
  //   - Transaction mode (port 6543): no prepared statements, no DDL
  //   - Session mode (port 5432): full SQL support including DDL
  //
  // Both modes share the same hostname (aws-X-{region}.pooler.supabase.com).
  // We just change the port from 6543 → 5432 and drop pgbouncer=true.
  //
  // This keeps the same hostname that DATABASE_URL already uses successfully,
  // so DNS resolution is guaranteed to work.
  if (host.includes('.pooler.supabase.com')) {
    // Session-mode pooler: same hostname, port 5432, no pgbouncer param.
    // Username stays as postgres.{ref} (pooler requires this format).
    return `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:5432/${database}`;
  }

  // Fallback for unknown Supabase URL shapes: extract project ref and try
  // session-mode pooler. This is best-effort.
  let projectRef = '';
  if (username.startsWith('postgres.')) {
    projectRef = username.replace(/^postgres\./, '');
  }
  if (!projectRef) {
    const m = host.match(/^([a-z0-9]{8,})\.pooler\.supabase\.com$/i);
    if (m) projectRef = m[1];
  }
  if (!projectRef) {
    const m = host.match(/^([a-z0-9]{8,})\.supabase\.co$/i);
    if (m) projectRef = m[1];
  }

  if (!projectRef || projectRef.length < 8) {
    logger.warn('[DB] toDirectUrl: could not extract project ref', { host, username });
    return null;
  }

  // Previously we constructed `db.{ref}.supabase.co:5432` here as a last-resort
  // fallback, but Supabase has DEPRECATED direct external connections from
  // Vercel/lambda — the DNS no longer resolves (ENOTFOUND). Returning null is
  // safer: callers will fall back to using DATABASE_URL as-is (the pooler),
  // which is guaranteed to work.
  logger.warn('[DB] toDirectUrl: could not determine pooler host for Supabase URL — returning null to force pooler fallback', {
    host,
    projectRef,
  });
  return null;
}

/**
 * Build connection configs for DDL operations.
 * Uses parsed individual params instead of connectionString to avoid
 * SSL parameter conflicts (sslmode=require in URL vs ssl object in config).
 */
export function getDdlConnectionConfigs(): PoolConfig[] {
  const configs: PoolConfig[] = [];

  // Config 1: standardized Prisma direct URL, with legacy DIRECT_URL fallback.
  // BUT skip it if it points to the deprecated db.*.supabase.co direct host
  // (Supabase has deprecated direct external connections — DNS no longer
  // resolves in many regions, causing ENOTFOUND errors from Vercel).
  const configuredDirectUrls = [process.env.DIRECT_DATABASE_URL, process.env.DIRECT_URL]
    .filter((candidate): candidate is string => Boolean(candidate));
  for (const configuredDirectUrl of [...new Set(configuredDirectUrls)]) {
    // When the deployment target contract is enabled, every alternate
    // connection path must satisfy it too. Never let DDL bypass the guard.
    buildPrismaUrl(configuredDirectUrl, process.env.EXPECTED_DATABASE_PROJECT_REF);
    const parsed = parsePgUrl(configuredDirectUrl);
    if (parsed) {
      const isDeprecatedDirect = parsed.host.startsWith('db.') && parsed.host.endsWith('.supabase.co');
      if (!isDeprecatedDirect) {
        configs.push({
          host: parsed.host,
          port: parseInt(parsed.port) || 5432,
          database: parsed.database,
          user: parsed.username,
          password: parsed.password,
          ssl: { rejectUnauthorized: false },
          max: 1,
          connectionTimeoutMillis: 5000,
          statement_timeout: 8000,
        });
      } else {
        logger.warn('[DB] getDdlConnectionConfigs: skipping DIRECT_URL — deprecated db.*.supabase.co host', {
          host: parsed.host,
        });
      }
    }
  }

  // Config 2: Auto-convert DATABASE_URL to direct URL
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl) buildPrismaUrl(dbUrl, process.env.EXPECTED_DATABASE_PROJECT_REF);
  const directUrl = toDirectUrl(dbUrl);
  if (directUrl) {
    const parsed = parsePgUrl(directUrl);
    if (parsed) {
      configs.push({
        host: parsed.host,
        port: parseInt(parsed.port) || 5432,
        database: parsed.database,
        user: parsed.username,
        password: parsed.password,
        ssl: { rejectUnauthorized: false },
        max: 1,
        connectionTimeoutMillis: 5000,
        statement_timeout: 8000,
      });
    }
  }

  // Config 3: Try the DATABASE_URL as-is (remove pgbouncer param, use session mode)
  if (dbUrl) {
    const cleanUrl = dbUrl.replace(/[?&]pgbouncer=true/gi, '').replace(/[?&]pgbouncer=false/gi, '');
    const parsed = parsePgUrl(cleanUrl);
    if (parsed) {
      configs.push({
        host: parsed.host,
        port: parseInt(parsed.port) || 5432,
        database: parsed.database,
        user: parsed.username,
        password: parsed.password,
        ssl: { rejectUnauthorized: false },
        max: 1,
        connectionTimeoutMillis: 5000,
        statement_timeout: 8000,
      });
    }
  }

  return configs;
}

let schemaCreated = false;
let createError: string | null = null;
let lastCreateDetail: string | null = null;

/**
 * ensureDb() - Non-blocking DB readiness check.
 *
 * In production, tables already exist via migrations or /api/db/init.
 * This function is now a no-op that returns true immediately.
 * Connection health is verified per-query by withRetry() inside safeDbQuery().
 * This eliminates the double-retry timeout problem on Vercel serverless.
 *
 * Kept for backward compatibility with existing routes that call await ensureDb().
 */
export async function ensureDb(): Promise<boolean> {
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
//  TABLE CREATION SQL
// ═══════════════════════════════════════════════════════════════════════════

const CREATE_ALL_TABLES_SQL = `
-- ── Core tables (no FK dependencies) ──

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailVerified" TIMESTAMP(3),
  "password" TEXT,
  "image" TEXT,
  "role" TEXT NOT NULL DEFAULT 'owner',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

CREATE TABLE IF NOT EXISTS "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "logo" TEXT,
  "website" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "plan" TEXT NOT NULL DEFAULT 'starter',
  "workingHoursStart" TEXT NOT NULL DEFAULT '09:00',
  "workingHoursEnd" TEXT NOT NULL DEFAULT '18:00',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "country" TEXT,
  "religion" TEXT,
  "brandTagline" TEXT,
  "brandColor" TEXT,
  "secondaryBrandColor" TEXT,
  "brandDescription" TEXT,
  "address" TEXT,
  "taxId" TEXT,
  "favicon" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paymentRejectionCount" INTEGER NOT NULL DEFAULT 0,
  "isBanned" BOOLEAN NOT NULL DEFAULT false,
  "banReason" TEXT,
  "bannedAt" TIMESTAMP(3),
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX IF NOT EXISTS "Organization_plan_idx" ON "Organization"("plan");
CREATE INDEX IF NOT EXISTS "Organization_isActive_idx" ON "Organization"("isActive");

CREATE TABLE IF NOT EXISTS "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "annualPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "period" TEXT NOT NULL DEFAULT 'monthly',
  "features" TEXT NOT NULL DEFAULT '[]',
  "teamLimit" INTEGER NOT NULL DEFAULT 3,
  "orderLimit" INTEGER NOT NULL DEFAULT 100,
  "productLimit" INTEGER NOT NULL DEFAULT 50,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "trialDays" INTEGER NOT NULL DEFAULT 14,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");
DO $$ BEGIN ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "quarterlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Role" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "permissions" TEXT NOT NULL DEFAULT '{}',
  "level" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Role_name_key" ON "Role"("name");

CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'system',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_key_key" ON "SystemSetting"("key");

CREATE TABLE IF NOT EXISTS "LegalPage" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalPage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LegalPage_slug_key" ON "LegalPage"("slug");

CREATE TABLE IF NOT EXISTS "PlatformSettings" (
  "id" TEXT NOT NULL,
  "companyName" TEXT NOT NULL DEFAULT 'Valtriox',
  "companyEmail" TEXT NOT NULL,
  "companyPhone" TEXT,
  "companyWebsite" TEXT,
  "companyAddress" TEXT,
  "supportHours" TEXT NOT NULL DEFAULT 'Mon-Fri: 9AM-6PM PKT',
  "whatsappNumber" TEXT,
  "instagramUrl" TEXT,
  "facebookUrl" TEXT,
  "twitterUrl" TEXT,
  "linkedinUrl" TEXT,
  "discordUrl" TEXT,
  "redditUrl" TEXT,
  "youtubeUrl" TEXT,
  "tiktokUrl" TEXT,
  "socialLinksVisible" TEXT NOT NULL DEFAULT 'true',
  "showInstagram" BOOLEAN NOT NULL DEFAULT false,
  "showFacebook" BOOLEAN NOT NULL DEFAULT false,
  "showTwitter" BOOLEAN NOT NULL DEFAULT false,
  "showLinkedin" BOOLEAN NOT NULL DEFAULT false,
  "showDiscord" BOOLEAN NOT NULL DEFAULT false,
  "showReddit" BOOLEAN NOT NULL DEFAULT false,
  "showYoutube" BOOLEAN NOT NULL DEFAULT false,
  "showTiktok" BOOLEAN NOT NULL DEFAULT false,
  "showWhatsApp" BOOLEAN NOT NULL DEFAULT false,
  "paymentMethods" TEXT NOT NULL DEFAULT '[]',
  "currency" TEXT NOT NULL DEFAULT 'PKR',
  "logoUrl" TEXT,
  "faviconUrl" TEXT,
  "primaryBrandColor" TEXT NOT NULL DEFAULT '#059669',
  "secondaryBrandColor" TEXT NOT NULL DEFAULT '#d97706',
  "currencySymbol" TEXT NOT NULL DEFAULT 'Rs.',
  "customCss" TEXT NOT NULL DEFAULT '',
  "tagline" TEXT NOT NULL DEFAULT 'COMMAND YOUR BRAND UNIVERSE',
  "emailFooterText" TEXT,
  "invoiceHeaderText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Lead" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "company" TEXT,
  "companySize" TEXT,
  "industry" TEXT,
  "interest" TEXT,
  "message" TEXT,
  "consultationType" TEXT,
  "preferredDate" TEXT,
  "preferredTime" TEXT,
  "timezone" TEXT,
  "availabilityNote" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "source" TEXT NOT NULL DEFAULT 'website',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status");
CREATE INDEX IF NOT EXISTS "Lead_email_idx" ON "Lead"("email");
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");

-- ── Proposal table (Post-Consultation Deliverables) ──
CREATE TABLE IF NOT EXISTS "Proposal" (
  "id" TEXT NOT NULL,
  "leadId" TEXT,
  "clientName" TEXT NOT NULL,
  "clientEmail" TEXT NOT NULL,
  "clientCompany" TEXT,
  "clientPhone" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "totalCost" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'PKR',
  "currencySymbol" TEXT NOT NULL DEFAULT 'Rs.',
  "validUntil" TIMESTAMP(3),
  "content" TEXT NOT NULL DEFAULT '{}',
  "notes" TEXT,
  "sentAt" TIMESTAMP(3),
  "viewedAt" TIMESTAMP(3),
  "respondedAt" TIMESTAMP(3),
  "payproOrderId" TEXT,
  "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
  "paidAt" TIMESTAMP(3),
  "paymentAmount" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Proposal_leadId_idx" ON "Proposal"("leadId");
CREATE INDEX IF NOT EXISTS "Proposal_status_idx" ON "Proposal"("status");
CREATE INDEX IF NOT EXISTS "Proposal_type_idx" ON "Proposal"("type");
CREATE INDEX IF NOT EXISTS "Proposal_clientEmail_idx" ON "Proposal"("clientEmail");
CREATE INDEX IF NOT EXISTS "Proposal_createdAt_idx" ON "Proposal"("createdAt");
CREATE INDEX IF NOT EXISTS "Proposal_paymentStatus_idx" ON "Proposal"("paymentStatus");
DO $$ BEGIN ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Add PayPro payment columns to existing Proposal tables ──
DO $$ BEGIN ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "payproOrderId" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "paymentAmount" DOUBLE PRECISION; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "Proposal_paymentStatus_idx" ON "Proposal"("paymentStatus");

-- ── Add billing security columns to Organization (for existing tables) ──
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "paymentRejectionCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "banReason" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP(3); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Add usage tracking columns to Organization (for plan limits) ──
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageOrdersCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageProductsCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageCustomersCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageStorageMb" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageInvoicesCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageCouponsCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageTasksCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageTeamChatsCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageBroadcastsCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageLastResetAt" TIMESTAMP(3); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Add new Lead columns (for existing tables) ──
DO $$ BEGIN ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "consultationType" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "preferredDate" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "preferredTime" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "timezone" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "availabilityNote" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "calendlyBookingLink" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastFollowUpAt" TIMESTAMP(3); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "followUpCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SupportConversation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "orgName" TEXT NOT NULL,
  "lastMessage" TEXT NOT NULL DEFAULT '',
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unreadAdmin" INTEGER NOT NULL DEFAULT 0,
  "unreadClient" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SupportConversation_organizationId_key" ON "SupportConversation"("organizationId");
CREATE INDEX IF NOT EXISTS "SupportConversation_lastMessageAt_idx" ON "SupportConversation"("lastMessageAt");

-- ── Tables with FK to User or Organization ──

CREATE TABLE IF NOT EXISTS "Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider","providerAccountId");
DO $$ BEGIN ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
DO $$ BEGIN ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "OrganizationMember" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "roleId" TEXT,
  "pin" TEXT,
  "pinCreatedAt" TIMESTAMP(3),
  "absenceCount" INTEGER NOT NULL DEFAULT 0,
  "penaltyUntil" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId","userId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_organizationId_role_idx" ON "OrganizationMember"("organizationId","role");
DO $$ BEGIN ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Add missing columns to OrganizationMember (for existing tables) ──
DO $$ BEGIN ALTER TABLE "OrganizationMember" ADD COLUMN IF NOT EXISTS "absenceCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationMember" ADD COLUMN IF NOT EXISTS "penaltyUntil" TIMESTAMP(3); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationMember" ADD COLUMN IF NOT EXISTS "pin" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationMember" ADD COLUMN IF NOT EXISTS "pinCreatedAt" TIMESTAMP(3); EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "orgId" TEXT,
  "userId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'info',
  "actionUrl" TEXT,
  "icon" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_orgId_idx" ON "Notification"("orgId");
CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read");
CREATE INDEX IF NOT EXISTS "Notification_type_idx" ON "Notification"("type");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
DO $$ BEGIN ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sku" TEXT,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "costPrice" DOUBLE PRECISION,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "category" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Product_organizationId_status_idx" ON "Product"("organizationId","status");
CREATE INDEX IF NOT EXISTS "Product_organizationId_category_idx" ON "Product"("organizationId","category");
CREATE INDEX IF NOT EXISTS "Product_organizationId_createdAt_idx" ON "Product"("organizationId","createdAt");
CREATE INDEX IF NOT EXISTS "Product_organizationId_stock_idx" ON "Product"("organizationId","stock");
DO $$ BEGIN ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "city" TEXT,
  "address" TEXT,
  "loyaltyTier" TEXT NOT NULL DEFAULT 'new',
  "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "orderCount" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Customer_organizationId_loyaltyTier_idx" ON "Customer"("organizationId","loyaltyTier");
CREATE INDEX IF NOT EXISTS "Customer_organizationId_totalSpent_idx" ON "Customer"("organizationId","totalSpent");
CREATE INDEX IF NOT EXISTS "Customer_organizationId_createdAt_idx" ON "Customer"("organizationId","createdAt");
DO $$ BEGIN ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Expense" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "category" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Expense_organizationId_date_idx" ON "Expense"("organizationId","date");
CREATE INDEX IF NOT EXISTS "Expense_organizationId_category_idx" ON "Expense"("organizationId","category");
DO $$ BEGIN ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Coupon" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'percentage',
  "value" DOUBLE PRECISION NOT NULL,
  "minOrder" DOUBLE PRECISION,
  "usageLimit" INTEGER,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Coupon_organizationId_isActive_idx" ON "Coupon"("organizationId","isActive");
CREATE INDEX IF NOT EXISTS "Coupon_organizationId_expiresAt_idx" ON "Coupon"("organizationId","expiresAt");
DO $$ BEGIN ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "TeamTask" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "assignedTo" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'todo',
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "dueDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamTask_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TeamTask_organizationId_status_idx" ON "TeamTask"("organizationId","status");
CREATE INDEX IF NOT EXISTS "TeamTask_organizationId_priority_idx" ON "TeamTask"("organizationId","priority");
CREATE INDEX IF NOT EXISTS "TeamTask_assignedTo_idx" ON "TeamTask"("assignedTo");
CREATE INDEX IF NOT EXISTS "TeamTask_organizationId_dueDate_idx" ON "TeamTask"("organizationId","dueDate");
DO $$ BEGIN ALTER TABLE "TeamTask" ADD CONSTRAINT "TeamTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Attendance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "clockIn" TIMESTAMP(3),
  "clockOut" TIMESTAMP(3),
  "totalHours" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'present',
  "lateReason" TEXT,
  "leaveReason" TEXT,
  "markedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_userId_organizationId_date_key" ON "Attendance"("userId","organizationId","date");
CREATE INDEX IF NOT EXISTS "Attendance_organizationId_date_idx" ON "Attendance"("organizationId","date");
CREATE INDEX IF NOT EXISTS "Attendance_organizationId_status_idx" ON "Attendance"("organizationId","status");
CREATE INDEX IF NOT EXISTS "Attendance_userId_date_idx" ON "Attendance"("userId","date");
DO $$ BEGIN ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Subscription / Payment tables ──

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'trial',
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "trialStartsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "trialEndsAt" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3),
  "lastReminderAt" TIMESTAMP(3),
  "reminderCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_organizationId_key" ON "Subscription"("organizationId");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");
DO $$ BEGIN ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PaymentProof" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT,
  "planName" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "transactionId" TEXT NOT NULL,
  "paymentMethod" TEXT NOT NULL DEFAULT 'bank_transfer',
  "screenshotUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "adminNote" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PaymentProof_organizationId_idx" ON "PaymentProof"("organizationId");
CREATE INDEX IF NOT EXISTS "PaymentProof_status_idx" ON "PaymentProof"("status");
DO $$ BEGIN ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "paymentProofId" TEXT,
  "planName" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "type" TEXT NOT NULL DEFAULT 'subscription',
  "currencyCode" TEXT NOT NULL DEFAULT 'PKR',
  "currencySymbol" TEXT NOT NULL DEFAULT 'Rs.',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "notes" TEXT,
  "pdfUrl" TEXT,
  "orgName" TEXT,
  "orgEmail" TEXT,
  "orgPhone" TEXT,
  "orgAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "Invoice_organizationId_idx" ON "Invoice"("organizationId");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");
DO $$ BEGIN ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Order tables ──

CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "channel" TEXT NOT NULL DEFAULT 'manual',
  "courier" TEXT,
  "trackingNumber" TEXT,
  "notes" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 50,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Order_organizationId_status_idx" ON "Order"("organizationId","status");
CREATE INDEX IF NOT EXISTS "Order_organizationId_createdAt_idx" ON "Order"("organizationId","createdAt");
CREATE INDEX IF NOT EXISTS "Order_organizationId_customerId_idx" ON "Order"("organizationId","customerId");
CREATE INDEX IF NOT EXISTS "Order_channel_idx" ON "Order"("channel");
CREATE INDEX IF NOT EXISTS "Order_orderNumber_idx" ON "Order"("orderNumber");
DO $$ BEGIN ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "total" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");
DO $$ BEGIN ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Team Invitation ──

CREATE TABLE IF NOT EXISTS "TeamInvitation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "inviterId" TEXT NOT NULL,
  "inviteeEmail" TEXT NOT NULL,
  "inviteeName" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "roleId" TEXT,
  "pin" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TeamInvitation_organizationId_idx" ON "TeamInvitation"("organizationId");
CREATE INDEX IF NOT EXISTS "TeamInvitation_inviteeEmail_idx" ON "TeamInvitation"("inviteeEmail");
CREATE INDEX IF NOT EXISTS "TeamInvitation_status_idx" ON "TeamInvitation"("status");
DO $$ BEGIN ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Valtriox Team (Platform-level team) ──

CREATE TABLE IF NOT EXISTS "ValtrioxTeamMember" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'platform_admin',
  "department" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "visibleSections" TEXT NOT NULL DEFAULT '[]',
  "invitedBy" TEXT,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActive" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ValtrioxTeamMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ValtrioxTeamMember_userId_key" ON "ValtrioxTeamMember"("userId");
CREATE INDEX IF NOT EXISTS "ValtrioxTeamMember_status_idx" ON "ValtrioxTeamMember"("status");
CREATE INDEX IF NOT EXISTS "ValtrioxTeamMember_department_idx" ON "ValtrioxTeamMember"("department");
DO $$ BEGIN ALTER TABLE "ValtrioxTeamMember" ADD COLUMN IF NOT EXISTS "visibleSections" TEXT NOT NULL DEFAULT '[]'; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ValtrioxTeamInvitation" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'platform_admin',
  "department" TEXT,
  "invitedBy" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  CONSTRAINT "ValtrioxTeamInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ValtrioxTeamInvitation_token_key" ON "ValtrioxTeamInvitation"("token");
CREATE INDEX IF NOT EXISTS "ValtrioxTeamInvitation_email_idx" ON "ValtrioxTeamInvitation"("email");
CREATE INDEX IF NOT EXISTS "ValtrioxTeamInvitation_status_idx" ON "ValtrioxTeamInvitation"("status");

-- ── Support Message ──

CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  "senderAvatar" TEXT,
  "senderRole" TEXT NOT NULL DEFAULT 'member',
  "content" TEXT NOT NULL DEFAULT '',
  "messageType" TEXT NOT NULL DEFAULT 'text',
  "attachmentData" TEXT,
  "voiceNoteData" TEXT,
  "callInfoData" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupportMessage_conversationId_createdAt_idx" ON "SupportMessage"("conversationId","createdAt");
DO $$ BEGIN ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Email Templates ──
CREATE TABLE IF NOT EXISTS "EmailTemplate" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "htmlContent" TEXT NOT NULL,
  "textContent" TEXT NOT NULL DEFAULT '',
  "variables" TEXT NOT NULL DEFAULT '[]',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplate_type_key" ON "EmailTemplate"("type");

-- ── Automations ──
CREATE TABLE IF NOT EXISTS "Automation" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "trigger" TEXT NOT NULL,
  "triggerConfig" TEXT NOT NULL DEFAULT '{}',
  "templateId" TEXT,
  "action" TEXT NOT NULL DEFAULT 'send_email',
  "actionConfig" TEXT NOT NULL DEFAULT '{}',
  "delayMinutes" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt" TIMESTAMP(3),
  "runCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Automation_enabled_idx" ON "Automation"("enabled");
CREATE INDEX IF NOT EXISTS "Automation_trigger_idx" ON "Automation"("trigger");
DO $$ BEGIN ALTER TABLE "Automation" ADD CONSTRAINT "Automation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
`;

// ═══════════════════════════════════════════════════════════════════════════
//  BATCHED DDL - split from CREATE_ALL_TABLES_SQL to avoid Vercel timeout
//  Each batch runs in a separate pool.query() call (~5-8s each vs 30s+ timeout)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Batch 1 - Core auth tables (critical: must exist for any operation).
 * User, Organization (+ ALTER columns for billing/usage), VerificationToken,
 * Account, Session, OrganizationMember (+ ALTER columns).
 */
const CORE_TABLES_SQL = `
-- ── User table ──
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailVerified" TIMESTAMP(3),
  "password" TEXT,
  "image" TEXT,
  "role" TEXT NOT NULL DEFAULT 'owner',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

-- ── Organization table ──
CREATE TABLE IF NOT EXISTS "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "logo" TEXT,
  "website" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "plan" TEXT NOT NULL DEFAULT 'starter',
  "workingHoursStart" TEXT NOT NULL DEFAULT '09:00',
  "workingHoursEnd" TEXT NOT NULL DEFAULT '18:00',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "country" TEXT,
  "religion" TEXT,
  "brandTagline" TEXT,
  "brandColor" TEXT,
  "secondaryBrandColor" TEXT,
  "brandDescription" TEXT,
  "address" TEXT,
  "taxId" TEXT,
  "favicon" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paymentRejectionCount" INTEGER NOT NULL DEFAULT 0,
  "isBanned" BOOLEAN NOT NULL DEFAULT false,
  "banReason" TEXT,
  "bannedAt" TIMESTAMP(3),
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX IF NOT EXISTS "Organization_plan_idx" ON "Organization"("plan");
CREATE INDEX IF NOT EXISTS "Organization_isActive_idx" ON "Organization"("isActive");

-- ── Add billing security columns to Organization (for existing tables) ──
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "paymentRejectionCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "banReason" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP(3); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Add usage tracking columns to Organization (for plan limits) ──
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageOrdersCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageProductsCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageCustomersCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageStorageMb" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageInvoicesCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageCouponsCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageTasksCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageTeamChatsCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageBroadcastsCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "usageLastResetAt" TIMESTAMP(3); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── VerificationToken ──
CREATE TABLE IF NOT EXISTS "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- ── Account ──
CREATE TABLE IF NOT EXISTS "Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider","providerAccountId");
DO $$ BEGIN ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Session ──
CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
DO $$ BEGIN ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── OrganizationMember ──
CREATE TABLE IF NOT EXISTS "OrganizationMember" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "roleId" TEXT,
  "pin" TEXT,
  "pinCreatedAt" TIMESTAMP(3),
  "absenceCount" INTEGER NOT NULL DEFAULT 0,
  "penaltyUntil" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId","userId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_organizationId_role_idx" ON "OrganizationMember"("organizationId","role");
DO $$ BEGIN ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Add missing columns to OrganizationMember (for existing tables) ──
DO $$ BEGIN ALTER TABLE "OrganizationMember" ADD COLUMN IF NOT EXISTS "absenceCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationMember" ADD COLUMN IF NOT EXISTS "penaltyUntil" TIMESTAMP(3); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationMember" ADD COLUMN IF NOT EXISTS "pin" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationMember" ADD COLUMN IF NOT EXISTS "pinCreatedAt" TIMESTAMP(3); EXCEPTION WHEN OTHERS THEN NULL; END $$;
`;

/**
 * Batch 2 - Business tables (no FK to User/Org, or FK to tables in this batch).
 * SubscriptionPlan, Role, SystemSetting, LegalPage, PlatformSettings,
 * Lead (+ ALTER columns), Proposal (+ ALTER columns), SupportConversation.
 */
const BUSINESS_TABLES_SQL = `
-- ── SubscriptionPlan ──
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "annualPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "period" TEXT NOT NULL DEFAULT 'monthly',
  "features" TEXT NOT NULL DEFAULT '[]',
  "teamLimit" INTEGER NOT NULL DEFAULT 3,
  "orderLimit" INTEGER NOT NULL DEFAULT 100,
  "productLimit" INTEGER NOT NULL DEFAULT 50,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "trialDays" INTEGER NOT NULL DEFAULT 14,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");
DO $$ BEGIN ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "quarterlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Role ──
CREATE TABLE IF NOT EXISTS "Role" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "permissions" TEXT NOT NULL DEFAULT '{}',
  "level" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Role_name_key" ON "Role"("name");

-- ── SystemSetting ──
CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'system',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_key_key" ON "SystemSetting"("key");

-- ── LegalPage ──
CREATE TABLE IF NOT EXISTS "LegalPage" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalPage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LegalPage_slug_key" ON "LegalPage"("slug");

-- ── PlatformSettings ──
CREATE TABLE IF NOT EXISTS "PlatformSettings" (
  "id" TEXT NOT NULL,
  "companyName" TEXT NOT NULL DEFAULT 'Valtriox',
  "companyEmail" TEXT NOT NULL,
  "companyPhone" TEXT,
  "companyWebsite" TEXT,
  "companyAddress" TEXT,
  "supportHours" TEXT NOT NULL DEFAULT 'Mon-Fri: 9AM-6PM PKT',
  "whatsappNumber" TEXT,
  "instagramUrl" TEXT,
  "facebookUrl" TEXT,
  "twitterUrl" TEXT,
  "linkedinUrl" TEXT,
  "discordUrl" TEXT,
  "redditUrl" TEXT,
  "youtubeUrl" TEXT,
  "tiktokUrl" TEXT,
  "socialLinksVisible" TEXT NOT NULL DEFAULT 'true',
  "showInstagram" BOOLEAN NOT NULL DEFAULT false,
  "showFacebook" BOOLEAN NOT NULL DEFAULT false,
  "showTwitter" BOOLEAN NOT NULL DEFAULT false,
  "showLinkedin" BOOLEAN NOT NULL DEFAULT false,
  "showDiscord" BOOLEAN NOT NULL DEFAULT false,
  "showReddit" BOOLEAN NOT NULL DEFAULT false,
  "showYoutube" BOOLEAN NOT NULL DEFAULT false,
  "showTiktok" BOOLEAN NOT NULL DEFAULT false,
  "showWhatsApp" BOOLEAN NOT NULL DEFAULT false,
  "paymentMethods" TEXT NOT NULL DEFAULT '[]',
  "currency" TEXT NOT NULL DEFAULT 'PKR',
  "logoUrl" TEXT,
  "faviconUrl" TEXT,
  "primaryBrandColor" TEXT NOT NULL DEFAULT '#059669',
  "secondaryBrandColor" TEXT NOT NULL DEFAULT '#d97706',
  "currencySymbol" TEXT NOT NULL DEFAULT 'Rs.',
  "customCss" TEXT NOT NULL DEFAULT '',
  "tagline" TEXT NOT NULL DEFAULT 'COMMAND YOUR BRAND UNIVERSE',
  "emailFooterText" TEXT,
  "invoiceHeaderText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- ── Lead ──
CREATE TABLE IF NOT EXISTS "Lead" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "company" TEXT,
  "companySize" TEXT,
  "industry" TEXT,
  "interest" TEXT,
  "message" TEXT,
  "consultationType" TEXT,
  "preferredDate" TEXT,
  "preferredTime" TEXT,
  "timezone" TEXT,
  "availabilityNote" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "source" TEXT NOT NULL DEFAULT 'website',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status");
CREATE INDEX IF NOT EXISTS "Lead_email_idx" ON "Lead"("email");
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");

-- ── Add new Lead columns (for existing tables) ──
DO $$ BEGIN ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "consultationType" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "preferredDate" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "preferredTime" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "timezone" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "availabilityNote" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "calendlyBookingLink" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Proposal table (Post-Consultation Deliverables) ──
CREATE TABLE IF NOT EXISTS "Proposal" (
  "id" TEXT NOT NULL,
  "leadId" TEXT,
  "clientName" TEXT NOT NULL,
  "clientEmail" TEXT NOT NULL,
  "clientCompany" TEXT,
  "clientPhone" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "totalCost" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'PKR',
  "currencySymbol" TEXT NOT NULL DEFAULT 'Rs.',
  "validUntil" TIMESTAMP(3),
  "content" TEXT NOT NULL DEFAULT '{}',
  "notes" TEXT,
  "sentAt" TIMESTAMP(3),
  "viewedAt" TIMESTAMP(3),
  "respondedAt" TIMESTAMP(3),
  "payproOrderId" TEXT,
  "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
  "paidAt" TIMESTAMP(3),
  "paymentAmount" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Proposal_leadId_idx" ON "Proposal"("leadId");
CREATE INDEX IF NOT EXISTS "Proposal_status_idx" ON "Proposal"("status");
CREATE INDEX IF NOT EXISTS "Proposal_type_idx" ON "Proposal"("type");
CREATE INDEX IF NOT EXISTS "Proposal_clientEmail_idx" ON "Proposal"("clientEmail");
CREATE INDEX IF NOT EXISTS "Proposal_createdAt_idx" ON "Proposal"("createdAt");
CREATE INDEX IF NOT EXISTS "Proposal_paymentStatus_idx" ON "Proposal"("paymentStatus");
DO $$ BEGIN ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Add PayPro payment columns to existing Proposal tables ──
DO $$ BEGIN ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "payproOrderId" TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "paymentAmount" DOUBLE PRECISION; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "Proposal_paymentStatus_idx" ON "Proposal"("paymentStatus");

-- ── SupportConversation ──
CREATE TABLE IF NOT EXISTS "SupportConversation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "orgName" TEXT NOT NULL,
  "lastMessage" TEXT NOT NULL DEFAULT '',
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unreadAdmin" INTEGER NOT NULL DEFAULT 0,
  "unreadClient" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SupportConversation_organizationId_key" ON "SupportConversation"("organizationId");
CREATE INDEX IF NOT EXISTS "SupportConversation_lastMessageAt_idx" ON "SupportConversation"("lastMessageAt");
`;

/**
 * Batch 3 - Operations tables (FK to User/Org from Batch 1).
 * Notification, Product, Customer, Expense, Coupon, TeamTask, Attendance.
 */
const OPERATIONS_TABLES_SQL = `
-- ── Notification ──
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "orgId" TEXT,
  "userId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'info',
  "actionUrl" TEXT,
  "icon" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_orgId_idx" ON "Notification"("orgId");
CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read");
CREATE INDEX IF NOT EXISTS "Notification_type_idx" ON "Notification"("type");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
DO $$ BEGIN ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Product ──
CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sku" TEXT,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "costPrice" DOUBLE PRECISION,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "category" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Product_organizationId_status_idx" ON "Product"("organizationId","status");
CREATE INDEX IF NOT EXISTS "Product_organizationId_category_idx" ON "Product"("organizationId","category");
CREATE INDEX IF NOT EXISTS "Product_organizationId_createdAt_idx" ON "Product"("organizationId","createdAt");
CREATE INDEX IF NOT EXISTS "Product_organizationId_stock_idx" ON "Product"("organizationId","stock");
DO $$ BEGIN ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Customer ──
CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "city" TEXT,
  "address" TEXT,
  "loyaltyTier" TEXT NOT NULL DEFAULT 'new',
  "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "orderCount" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Customer_organizationId_loyaltyTier_idx" ON "Customer"("organizationId","loyaltyTier");
CREATE INDEX IF NOT EXISTS "Customer_organizationId_totalSpent_idx" ON "Customer"("organizationId","totalSpent");
CREATE INDEX IF NOT EXISTS "Customer_organizationId_createdAt_idx" ON "Customer"("organizationId","createdAt");
DO $$ BEGIN ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Expense ──
CREATE TABLE IF NOT EXISTS "Expense" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "category" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Expense_organizationId_date_idx" ON "Expense"("organizationId","date");
CREATE INDEX IF NOT EXISTS "Expense_organizationId_category_idx" ON "Expense"("organizationId","category");
DO $$ BEGIN ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Coupon ──
CREATE TABLE IF NOT EXISTS "Coupon" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'percentage',
  "value" DOUBLE PRECISION NOT NULL,
  "minOrder" DOUBLE PRECISION,
  "usageLimit" INTEGER,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Coupon_organizationId_isActive_idx" ON "Coupon"("organizationId","isActive");
CREATE INDEX IF NOT EXISTS "Coupon_organizationId_expiresAt_idx" ON "Coupon"("organizationId","expiresAt");
DO $$ BEGIN ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── TeamTask ──
CREATE TABLE IF NOT EXISTS "TeamTask" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "assignedTo" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'todo',
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "dueDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamTask_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TeamTask_organizationId_status_idx" ON "TeamTask"("organizationId","status");
CREATE INDEX IF NOT EXISTS "TeamTask_organizationId_priority_idx" ON "TeamTask"("organizationId","priority");
CREATE INDEX IF NOT EXISTS "TeamTask_assignedTo_idx" ON "TeamTask"("assignedTo");
CREATE INDEX IF NOT EXISTS "TeamTask_organizationId_dueDate_idx" ON "TeamTask"("organizationId","dueDate");
DO $$ BEGIN ALTER TABLE "TeamTask" ADD CONSTRAINT "TeamTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Attendance ──
CREATE TABLE IF NOT EXISTS "Attendance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "clockIn" TIMESTAMP(3),
  "clockOut" TIMESTAMP(3),
  "totalHours" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'present',
  "lateReason" TEXT,
  "leaveReason" TEXT,
  "markedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_userId_organizationId_date_key" ON "Attendance"("userId","organizationId","date");
CREATE INDEX IF NOT EXISTS "Attendance_organizationId_date_idx" ON "Attendance"("organizationId","date");
CREATE INDEX IF NOT EXISTS "Attendance_organizationId_status_idx" ON "Attendance"("organizationId","status");
CREATE INDEX IF NOT EXISTS "Attendance_userId_date_idx" ON "Attendance"("userId","date");
DO $$ BEGIN ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
`;

/**
 * Batch 4 - Subscription & Payment tables.
 * Subscription, PaymentProof, Invoice.
 */
const SUBSCRIPTION_TABLES_SQL = `
-- ── Subscription / Payment tables ──

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'trial',
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "trialStartsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "trialEndsAt" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3),
  "lastReminderAt" TIMESTAMP(3),
  "reminderCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_organizationId_key" ON "Subscription"("organizationId");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");
DO $$ BEGIN ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PaymentProof" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT,
  "planName" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "transactionId" TEXT NOT NULL,
  "paymentMethod" TEXT NOT NULL DEFAULT 'bank_transfer',
  "screenshotUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "adminNote" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PaymentProof_organizationId_idx" ON "PaymentProof"("organizationId");
CREATE INDEX IF NOT EXISTS "PaymentProof_status_idx" ON "PaymentProof"("status");
DO $$ BEGIN ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "paymentProofId" TEXT,
  "planName" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "type" TEXT NOT NULL DEFAULT 'subscription',
  "currencyCode" TEXT NOT NULL DEFAULT 'PKR',
  "currencySymbol" TEXT NOT NULL DEFAULT 'Rs.',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "notes" TEXT,
  "pdfUrl" TEXT,
  "orgName" TEXT,
  "orgEmail" TEXT,
  "orgPhone" TEXT,
  "orgAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "Invoice_organizationId_idx" ON "Invoice"("organizationId");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");
DO $$ BEGIN ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
`;

/**
 * Batch 5 - Order tables + TeamInvitation.
 * Order, OrderItem, TeamInvitation.
 */
const ORDER_TABLES_SQL = `
-- ── Order tables ──

CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "channel" TEXT NOT NULL DEFAULT 'manual',
  "courier" TEXT,
  "trackingNumber" TEXT,
  "notes" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 50,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Order_organizationId_status_idx" ON "Order"("organizationId","status");
CREATE INDEX IF NOT EXISTS "Order_organizationId_createdAt_idx" ON "Order"("organizationId","createdAt");
CREATE INDEX IF NOT EXISTS "Order_organizationId_customerId_idx" ON "Order"("organizationId","customerId");
CREATE INDEX IF NOT EXISTS "Order_channel_idx" ON "Order"("channel");
CREATE INDEX IF NOT EXISTS "Order_orderNumber_idx" ON "Order"("orderNumber");
DO $$ BEGIN ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "total" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");
DO $$ BEGIN ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Team Invitation ──

CREATE TABLE IF NOT EXISTS "TeamInvitation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "inviterId" TEXT NOT NULL,
  "inviteeEmail" TEXT NOT NULL,
  "inviteeName" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "roleId" TEXT,
  "pin" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TeamInvitation_organizationId_idx" ON "TeamInvitation"("organizationId");
CREATE INDEX IF NOT EXISTS "TeamInvitation_inviteeEmail_idx" ON "TeamInvitation"("inviteeEmail");
CREATE INDEX IF NOT EXISTS "TeamInvitation_status_idx" ON "TeamInvitation"("status");
DO $$ BEGIN ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
`;

/**
 * Batch 6 - Remaining tables.
 * ValtrioxTeamMember, ValtrioxTeamInvitation, SupportMessage,
 * EmailTemplate, Automation.
 */
const REMAINING_TABLES_SQL = `
-- ── Valtriox Team (Platform-level team) ──

CREATE TABLE IF NOT EXISTS "ValtrioxTeamMember" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'platform_admin',
  "department" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "visibleSections" TEXT NOT NULL DEFAULT '[]',
  "invitedBy" TEXT,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActive" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ValtrioxTeamMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ValtrioxTeamMember_userId_key" ON "ValtrioxTeamMember"("userId");
CREATE INDEX IF NOT EXISTS "ValtrioxTeamMember_status_idx" ON "ValtrioxTeamMember"("status");
CREATE INDEX IF NOT EXISTS "ValtrioxTeamMember_department_idx" ON "ValtrioxTeamMember"("department");
DO $$ BEGIN ALTER TABLE "ValtrioxTeamMember" ADD COLUMN IF NOT EXISTS "visibleSections" TEXT NOT NULL DEFAULT '[]'; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ValtrioxTeamInvitation" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'platform_admin',
  "department" TEXT,
  "invitedBy" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  CONSTRAINT "ValtrioxTeamInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ValtrioxTeamInvitation_token_key" ON "ValtrioxTeamInvitation"("token");
CREATE INDEX IF NOT EXISTS "ValtrioxTeamInvitation_email_idx" ON "ValtrioxTeamInvitation"("email");
CREATE INDEX IF NOT EXISTS "ValtrioxTeamInvitation_status_idx" ON "ValtrioxTeamInvitation"("status");

-- ── Support Message ──

CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  "senderAvatar" TEXT,
  "senderRole" TEXT NOT NULL DEFAULT 'member',
  "content" TEXT NOT NULL DEFAULT '',
  "messageType" TEXT NOT NULL DEFAULT 'text',
  "attachmentData" TEXT,
  "voiceNoteData" TEXT,
  "callInfoData" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupportMessage_conversationId_createdAt_idx" ON "SupportMessage"("conversationId","createdAt");
DO $$ BEGIN ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Email Templates ──
CREATE TABLE IF NOT EXISTS "EmailTemplate" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "htmlContent" TEXT NOT NULL,
  "textContent" TEXT NOT NULL DEFAULT '',
  "variables" TEXT NOT NULL DEFAULT '[]',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplate_type_key" ON "EmailTemplate"("type");

-- ── Automations ──
CREATE TABLE IF NOT EXISTS "Automation" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "trigger" TEXT NOT NULL,
  "triggerConfig" TEXT NOT NULL DEFAULT '{}',
  "templateId" TEXT,
  "action" TEXT NOT NULL DEFAULT 'send_email',
  "actionConfig" TEXT NOT NULL DEFAULT '{}',
  "delayMinutes" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt" TIMESTAMP(3),
  "runCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Automation_enabled_idx" ON "Automation"("enabled");
CREATE INDEX IF NOT EXISTS "Automation_trigger_idx" ON "Automation"("trigger");
DO $$ BEGIN ALTER TABLE "Automation" ADD CONSTRAINT "Automation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
`;

const NEW_TABLES_SQL = `
-- ── Platform Documents (Cloudinary-backed uploads) ──

CREATE TABLE IF NOT EXISTS "PlatformDocument" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "fileName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileType" TEXT NOT NULL DEFAULT 'document',
  "cloudinaryUrl" TEXT,
  "cloudinaryPublicId" TEXT,
  "category" TEXT NOT NULL DEFAULT 'uploaded',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PlatformDocument_category_idx" ON "PlatformDocument"("category");
CREATE INDEX IF NOT EXISTS "PlatformDocument_isActive_idx" ON "PlatformDocument"("isActive");
CREATE INDEX IF NOT EXISTS "PlatformDocument_fileType_idx" ON "PlatformDocument"("fileType");

-- ── Integration Connections ──

CREATE TABLE IF NOT EXISTS "IntegrationConnection" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'disconnected',
  "config" TEXT,
  "metadata" TEXT,
  "connectedAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationConnection_organizationId_type_key" ON "IntegrationConnection"("organizationId","type");
CREATE INDEX IF NOT EXISTS "IntegrationConnection_organizationId_idx" ON "IntegrationConnection"("organizationId");
CREATE INDEX IF NOT EXISTS "IntegrationConnection_type_idx" ON "IntegrationConnection"("type");
CREATE INDEX IF NOT EXISTS "IntegrationConnection_status_idx" ON "IntegrationConnection"("status");
DO $$ BEGIN ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Feedback & Testimonials ──

CREATE TABLE IF NOT EXISTS "Feedback" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "rating" INTEGER,
  "content" TEXT NOT NULL,
  "authorName" TEXT,
  "authorCompany" TEXT,
  "videoUrl" TEXT,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Feedback_organizationId_type_idx" ON "Feedback"("organizationId","type");
CREATE INDEX IF NOT EXISTS "Feedback_status_idx" ON "Feedback"("status");
DO $$ BEGIN ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── Beta Invites ──

CREATE TABLE IF NOT EXISTS "BetaInvite" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "plan" TEXT NOT NULL DEFAULT 'enterprise',
  "invitedBy" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'sent',
  "trialDays" INTEGER NOT NULL DEFAULT 14,
  "expiresAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BetaInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BetaInvite_email_key" ON "BetaInvite"("email");
CREATE INDEX IF NOT EXISTS "BetaInvite_status_idx" ON "BetaInvite"("status");
CREATE INDEX IF NOT EXISTS "BetaInvite_invitedBy_idx" ON "BetaInvite"("invitedBy");
`;

/** Ordered array of DDL batches - executed sequentially in tryCreateWithConfig */
const DDL_BATCHES = [
  CORE_TABLES_SQL,
  BUSINESS_TABLES_SQL,
  OPERATIONS_TABLES_SQL,
  SUBSCRIPTION_TABLES_SQL,
  ORDER_TABLES_SQL,
  REMAINING_TABLES_SQL,
  NEW_TABLES_SQL,
];

const DDL_BATCH_NAMES = [
  'Core auth tables',
  'Business tables',
  'Operations tables',
  'Subscription & Payment tables',
  'Order tables',
  'Remaining tables',
  'New tables (PlatformDocument, IntegrationConnection, Feedback, BetaInvite)',
];

// ═══════════════════════════════════════════════════════════════════════════
//  TABLE CREATION - tries multiple connection methods
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classify a connection error into a human-friendly message.
 */
function classifyConnectionError(err: unknown): string {
  const { message, code } = getErrorInfo(err);
  const msg = message.toLowerCase();

  if (msg.includes('enotfound') || msg.includes('getaddrinfo')) {
    return 'Host not found - check that the database URL is correct';
  }
  if (msg.includes('econnrefused')) {
    return 'Connection refused - the database host/port may be wrong or the DB is not accepting connections';
  }
  if (msg.includes('etimedout') || msg.includes('timeout')) {
    return 'Connection timed out - the database might be paused, or network/firewall is blocking the connection';
  }
  if (msg.includes('authentication') || msg.includes('password') || code === '28P01') {
    return 'Authentication failed - check the database password in DATABASE_URL';
  }
  if (msg.includes('ssl') || msg.includes('certificate')) {
    return 'SSL error - the database requires SSL but the connection could not negotiate it';
  }
  if (msg.includes('too many connections') || code === '53300') {
    return 'Too many connections - the database connection pool is exhausted';
  }
  if (msg.includes('ddl') || msg.includes('pgbouncer') || msg.includes('prepared statement')) {
    return 'DDL blocked by PgBouncer - direct connection is required for CREATE TABLE';
  }
  return msg || String(err);
}

/**
 * Try creating tables using a single connection config.
 * Runs DDL in sequential batches to avoid Vercel serverless function timeouts.
 */
async function tryCreateWithConfig(config: PoolConfig, label: string): Promise<{ success: boolean; error: string | null }> {
  const pool = new Pool(config);
  try {
    logger.info('[DB] Attempting table creation', { method: label });

    // Test connection first
    await pool.query('SELECT 1 as ok');
    logger.info('[DB] Connection test PASSED', { method: label });

    // Execute DDL in batches to avoid timeout on Vercel serverless functions
    for (let i = 0; i < DDL_BATCHES.length; i++) {
      if (!DDL_BATCHES[i]) continue; // Skip empty batches
      const batchName = DDL_BATCH_NAMES[i] || `Batch ${i + 1}`;
      logger.info('[DB] Running DDL batch', { batch: i + 1, total: DDL_BATCHES.length, name: batchName, method: label });
      const startTime = Date.now();
      await pool.query(DDL_BATCHES[i]);
      const elapsed = Date.now() - startTime;
      logger.info('[DB] DDL batch completed', { batch: i + 1, total: DDL_BATCHES.length, name: batchName, elapsed, method: label });
    }

    logger.info('[DB] All batches completed', { total: DDL_BATCHES.length, method: label });
    return { success: true, error: null };
  } catch (err: unknown) {
    const { message: errMsg, code: errCode } = getErrorInfo(err);
    const friendly = classifyConnectionError(err);
    logger.error(`[DB] ${label} FAILED`, { friendly });
    logger.error('[DB] Raw error', { errMsg, errCode });
    return { success: false, error: friendly };
  } finally {
    try { await pool.end(); } catch {}
  }
}

/**
 * createAllTables - Creates all 27 database tables.
 * Tries multiple connection strategies in order:
 *   1. DIRECT_URL env var (if set)
 *   2. Auto-converted direct URL (from DATABASE_URL pooler format)
 *   3. DATABASE_URL as-is (might work if it's already direct)
 */
export async function createAllTables(): Promise<boolean> {
  if (schemaCreated) return true;

  const configs = getDdlConnectionConfigs();
  logger.info('[DB] createAllTables: trying connection methods', { count: configs.length });
  // FIX 4.9: Use non-logging check — avoid any env var reference in logs
  const hasDbUrl = !!process.env.DATABASE_URL;
  const hasDirectUrl = !!process.env.DIRECT_URL;
  if (process.env.NODE_ENV !== "production") {
    logger.info('[DB] DATABASE_URL set', { hasDbUrl });
    logger.info('[DB] DIRECT_URL set', { hasDirectUrl });
  }

  if (configs.length === 0) {
    createError = 'No database URL configured. Set DATABASE_URL in Vercel environment variables.';
    lastCreateDetail = createError;
    logger.error('[DB] Configuration error', createError);
    return false;
  }

  for (let i = 0; i < configs.length; i++) {
    const labels = [
      'DIRECT_URL env var',
      'Auto-converted direct URL',
      'DATABASE_URL as-is',
    ];
    const result = await tryCreateWithConfig(configs[i], labels[i] || `Method ${i + 1}`);
    if (result.success) {
      schemaCreated = true;
      createError = null;
      lastCreateDetail = `Created via: ${labels[i]}`;
      return true;
    }
    // Save the last error for debugging
    createError = result.error;
    lastCreateDetail = `${labels[i]} failed: ${result.error}`;
  }

  logger.error('[DB] ALL connection methods failed');
  logger.error('[DB] Last error', createError);
  return false;
}

/**
 * Get the last creation error (for debugging).
 */
export function getCreateError(): string | null {
  return createError;
}

export function getLastCreateDetail(): string | null {
  return lastCreateDetail;
}

/**
 * Reset the schema created flag (for retry).
 */
export function resetSchemaFlag(): void {
  schemaCreated = false;
  createError = null;
  lastCreateDetail = null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  DIRECT PG POOL - For API routes that need reliable queries
//  Bypasses PgBouncer entirely so SELECT/INSERT/UPDATE always work.
// ═══════════════════════════════════════════════════════════════════════════

const directPoolCache: { pool: Pool | null; url: string | null } = { pool: null, url: null };

/**
 * Returns a `pg.Pool` connected DIRECTLY to the database (port 5432),
 * bypassing PgBouncer. This ensures SELECT/INSERT/UPDATE always work
 * without PgBouncer's transaction-mode limitations.
 *
 * Uses individual params (not connectionString) to avoid SSL conflicts.
 *
 * Tries (in order):
 *   1. DIRECT_URL env var (if set)
 *   2. Auto-converted direct URL from DATABASE_URL
 *   3. DATABASE_URL as-is (fallback)
 */
export function getDirectPool(): Pool {
  const url = getPrismaUrl();
  if (!url) {
    throw new Error('DATABASE_URL not configured');
  }

  // Build the best possible direct connection URL
  let bestUrl: string | null = null;

  // 1. DIRECT_URL env var — BUT only if it doesn't point to the deprecated
  //    db.{ref}.supabase.co direct host. Supabase has deprecated direct
  //    external connections from Vercel/lambda — the DNS no longer resolves
  //    in many regions (returns ENOTFOUND). If DIRECT_URL points there, skip
  //    it and fall through to the auto-converted session-mode pooler URL.
  const configuredDirectUrls = [process.env.DIRECT_DATABASE_URL, process.env.DIRECT_URL]
    .filter((candidate): candidate is string => Boolean(candidate));
  for (const configuredDirectUrl of [...new Set(configuredDirectUrls)]) {
    buildPrismaUrl(configuredDirectUrl, process.env.EXPECTED_DATABASE_PROJECT_REF);
    const directParsed = parsePgUrl(configuredDirectUrl);
    if (directParsed && directParsed.host.startsWith('db.') && directParsed.host.endsWith('.supabase.co')) {
      // Deprecated direct host — skip and use session-mode pooler instead
      logger.warn('[DB] getDirectPool: DIRECT_URL points to deprecated db.*.supabase.co host — skipping in favor of session-mode pooler', {
        host: directParsed.host,
      });
    } else {
      bestUrl = configuredDirectUrl;
      break;
    }
  }

  // 2. Auto-convert DATABASE_URL to direct (now: session-mode pooler)
  if (!bestUrl) {
    bestUrl = toDirectUrl(url);
  }

  // 3. Fallback: use DATABASE_URL as-is (remove pgbouncer param)
  if (!bestUrl) {
    bestUrl = url.replace(/[?&]pgbouncer=true/gi, '').replace(/[?&]$/, '');
  }

  // 4. Final safety net: if the resolved bestUrl STILL points to db.*.supabase.co
  //    (e.g. toDirectUrl fallback path), swap to the pooler URL from DATABASE_URL.
  //    This guarantees we never try to connect to a host that returns ENOTFOUND.
  if (bestUrl) {
    const finalParsed = parsePgUrl(bestUrl);
    if (finalParsed && finalParsed.host.startsWith('db.') && finalParsed.host.endsWith('.supabase.co')) {
      const dbUrlParsed = parsePgUrl(url);
      if (dbUrlParsed && dbUrlParsed.host.includes('.pooler.supabase.com')) {
        // Use session-mode pooler: same hostname, port 5432
        bestUrl = `postgresql://${encodeURIComponent(dbUrlParsed.username)}:${encodeURIComponent(dbUrlParsed.password)}@${dbUrlParsed.host}:5432/${dbUrlParsed.database}`;
        logger.warn('[DB] getDirectPool: bestUrl was deprecated db.* host — replaced with session-mode pooler', {
          poolerHost: dbUrlParsed.host,
        });
      }
    }
  }

  // Reuse pool if the URL hasn't changed
  if (directPoolCache.pool && directPoolCache.url === bestUrl) {
    return directPoolCache.pool;
  }

  // Clean up old pool
  if (directPoolCache.pool) {
    directPoolCache.pool.end().catch(() => {});
  }

  // Parse URL into individual params to avoid SSL conflicts
  const parsed = parsePgUrl(bestUrl!);
  if (!parsed) {
    throw new Error('getDirectPool: failed to parse connection URL');
  }

  const pool = new Pool({
    host: parsed.host,
    port: parseInt(parsed.port) || 5432,
    database: parsed.database,
    user: parsed.username,
    password: parsed.password,
    ssl: { rejectUnauthorized: false },
    max: 3,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 5000,
    statement_timeout: 8000,
  });

  directPoolCache.pool = pool;
  directPoolCache.url = bestUrl;

  logger.info('[DB] getDirectPool: using direct connection');
  return pool;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Resilient direct query — falls back to PgBouncer pool on ENOTFOUND/DNS err
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run a SQL query on the direct pool, but if the direct pool fails with a
 * DNS / connection error (ENOTFOUND, ECONNREFUSED, ECONNRESET), retry the
 * same query through Prisma's normal pool (PgBouncer transaction mode).
 *
 * Use this for one-off DDL/INSERT/UPDATE statements that need the direct
 * pool's session-mode capabilities but might be deployed to an environment
 * where the direct host isn't reachable.
 */
export async function resilientDirectQuery(
  sqlText: string,
  params: any[] = []
): Promise<{ ok: boolean; error?: string; rows?: any[] }> {
  // Try direct pool first
  try {
    const pool = getDirectPool();
    const result = await pool.query(sqlText, params);
    return { ok: true, rows: result.rows };
  } catch (directErr: unknown) {
    const msg = directErr instanceof Error ? directErr.message : String(directErr);
    // If it's a DNS/connection error, fall back to Prisma's PgBouncer pool
    if (
      msg.includes('ENOTFOUND') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('ECONNRESET') ||
      msg.includes('getaddrinfo') ||
      msg.includes('Can\'t reach database server')
    ) {
      logger.warn('[DB] resilientDirectQuery: direct pool failed, falling back to Prisma', {
        error: msg.substring(0, 100),
      });
      try {
        // For parameterized queries, use $queryRawUnsafe with placeholders
        if (params.length > 0) {
          // Prisma's $queryRawUnsafe supports ? or $1 placeholders depending on driver
          // For pg, use $1, $2, ... — convert ? to $N
          let prismaSql = sqlText;
          let idx = 1;
          while (prismaSql.includes('?')) {
            prismaSql = prismaSql.replace('?', `$${idx}`);
            idx++;
          }
          // For non-SELECT statements (DDL, INSERT, UPDATE, DELETE, DO $$),
          // use $executeRawUnsafe which returns affected-row count instead of
          // trying to deserialize rows (which fails for INSERT ... RETURNING
          // and DO blocks in PgBouncer transaction mode).
          const trimmed = prismaSql.trim().toUpperCase();
          const isMutation =
            trimmed.startsWith('INSERT') ||
            trimmed.startsWith('UPDATE') ||
            trimmed.startsWith('DELETE') ||
            trimmed.startsWith('ALTER') ||
            trimmed.startsWith('CREATE') ||
            trimmed.startsWith('DROP') ||
            trimmed.startsWith('DO') ||
            trimmed.startsWith('BEGIN') ||
            trimmed.startsWith('COMMIT');
          if (isMutation) {
            await db.$executeRawUnsafe(prismaSql, ...params);
            return { ok: true, rows: [] };
          }
          const rows = await db.$queryRawUnsafe(prismaSql, ...params);
          return { ok: true, rows: rows as any[] };
        } else {
          const trimmed = sqlText.trim().toUpperCase();
          const isMutation =
            trimmed.startsWith('INSERT') ||
            trimmed.startsWith('UPDATE') ||
            trimmed.startsWith('DELETE') ||
            trimmed.startsWith('ALTER') ||
            trimmed.startsWith('CREATE') ||
            trimmed.startsWith('DROP') ||
            trimmed.startsWith('DO') ||
            trimmed.startsWith('BEGIN') ||
            trimmed.startsWith('COMMIT');
          if (isMutation) {
            await db.$executeRawUnsafe(sqlText);
            return { ok: true, rows: [] };
          }
          const rows = await db.$queryRawUnsafe(sqlText);
          return { ok: true, rows: rows as any[] };
        }
      } catch (prismaErr: unknown) {
        const pmsg = prismaErr instanceof Error ? prismaErr.message : String(prismaErr);
        logger.error('[DB] resilientDirectQuery: Prisma fallback also failed', {
          error: pmsg.substring(0, 150),
        });
        return { ok: false, error: `direct: ${msg.substring(0, 80)} | prisma: ${pmsg.substring(0, 80)}` };
      }
    }
    // For non-DNS errors, return the direct error
    return { ok: false, error: msg };
  }
}

/**
 * Safe query helper.
 */
export async function safeQuery<T>(queryFn: () => Promise<T>): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await queryFn();
    return { data, error: null };
  } catch (err: unknown) {
    const { message: msg } = getErrorInfo(err);
    logger.error('[DB] Query error', { message: msg });
    return { data: null, error: msg };
  }
}

export function dbErrorResponse(error: unknown) {
  // FIX 3.4: Never expose internal error details to clients in production
  const message = error instanceof Error ? error.message : 'Database connection failed';
  const body = process.env.NODE_ENV === 'production'
    ? { error: 'Service temporarily unavailable' }
    : { error: 'Service temporarily unavailable', details: message };
  return new Response(
    JSON.stringify(body),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SAFE DB QUERY WRAPPER - Use this in ALL API routes for bulletproof DB access
// ═══════════════════════════════════════════════════════════════════════════

/**
 * safeDbQuery() - The ONLY way API routes should run Prisma queries.
 *
 * Combines ensureDb() + withRetry() + error classification into one call.
 * Returns { data, error, unavailable, schemaError } - never throws.
 *
 * Usage:
 *   const { data: proposals, error } = await safeDbQuery(() =>
 *     db.proposal.findMany({ where, orderBy: { createdAt: 'desc' } })
 *   );
 *   if (error) return NextResponse.json({ error }, { status: 500 });
 *
 * For multiple parallel queries:
 *   const [r1, r2] = await Promise.all([
 *     safeDbQuery(() => db.proposal.findMany(...)),
 *     safeDbQuery(() => db.proposal.count(...)),
 *   ]);
 *   if (r1.error) return r1.errorResponse;
 */
export async function safeDbQuery<TResult>(
  queryFn: () => TResult,
  retries = 3,
  baseDelay = 300
): Promise<{
  data: Awaited<TResult> | null;
  error: string | null;
  /** The original raw error object — preserves Prisma code/message/meta
   *  even in production. Use this in admin-only routes to build detailed
   *  error messages for diagnosis. NOT for end-user-facing routes. */
  rawError: unknown;
  unavailable: boolean;
  schemaError: boolean;
  errorResponse: Response;
}> {
  try {
    // ensureDb() is now a no-op - real retry logic is in withRetry()
    const data = await withRetry(queryFn, retries, baseDelay);
    return { data, error: null, rawError: null, unavailable: false, schemaError: false, errorResponse: new Response(JSON.stringify({}), { status: 200 }) };
  } catch (err: unknown) {
    const { message: msg } = getErrorInfo(err);
    const unavailable = isDbUnavailable(err);
    const schemaErr = isSchemaError(err);
    const status = unavailable ? 503 : 500;

    // FIX 9: Never expose internal error details to clients in production
    // Matches the pattern already applied to dbErrorResponse()
    // NOTE: rawError is still preserved above for admin-only routes to introspect.
    const errorObj = process.env.NODE_ENV === 'production'
      ? { error: unavailable ? 'Service temporarily unavailable' : 'Database query failed' }
      : { error: unavailable ? 'Service temporarily unavailable' : 'Database query failed', detail: msg.substring(0, 200) };

    logger.error(`[safeDbQuery] ${unavailable ? 'DB_UNAVAILABLE' : schemaErr ? 'SCHEMA_ERROR' : 'QUERY_ERROR'}`, {
      kind: classifyDatabaseError(err),
      code: getErrorInfo(err).code || 'unknown',
    });

    return {
      data: null,
      error: process.env.NODE_ENV === 'production'
        ? (unavailable ? 'Service temporarily unavailable' : 'Database query failed')
        : msg,
      rawError: err,
      unavailable,
      schemaError: schemaErr,
      errorResponse: NextResponse.json(errorObj, { status }),
    };
  }
}

export function isDbUnavailable(error: unknown): boolean {
  return isDatabaseUnavailableError(error);
}

/**
 * Check if error is a schema mismatch (column/table doesn't exist).
 * These are NOT transient errors - they indicate Prisma schema is out of sync
 * with the actual database. Should be reported as 500 with details.
 */
export function isSchemaError(error: unknown): boolean {
  return classifyDatabaseError(error) === "schema";
}

// ═══════════════════════════════════════════════════════════════════════════
//  PLATFORM SETTINGS COLUMN REPAIR - shared between admin & public routes
// ═══════════════════════════════════════════════════════════════════════════

const PLATFORM_SETTINGS_COLUMNS: { name: string; type: string }[] = [
  { name: "companyName", type: "TEXT NOT NULL DEFAULT 'Valtriox'" },
  { name: "companyEmail", type: "TEXT NOT NULL" },
  { name: "companyPhone", type: "TEXT" },
  { name: "companyWebsite", type: "TEXT" },
  { name: "companyAddress", type: "TEXT" },
  { name: "supportHours", type: "TEXT NOT NULL DEFAULT 'Mon-Fri: 9AM-6PM PKT'" },
  { name: "whatsappNumber", type: "TEXT" },
  { name: "instagramUrl", type: "TEXT" },
  { name: "facebookUrl", type: "TEXT" },
  { name: "twitterUrl", type: "TEXT" },
  { name: "linkedinUrl", type: "TEXT" },
  { name: "discordUrl", type: "TEXT" },
  { name: "redditUrl", type: "TEXT" },
  { name: "youtubeUrl", type: "TEXT" },
  { name: "tiktokUrl", type: "TEXT" },
  { name: "socialLinksVisible", type: "TEXT NOT NULL DEFAULT 'true'" },
  { name: "showInstagram", type: "BOOLEAN NOT NULL DEFAULT false" },
  { name: "showFacebook", type: "BOOLEAN NOT NULL DEFAULT false" },
  { name: "showTwitter", type: "BOOLEAN NOT NULL DEFAULT false" },
  { name: "showLinkedin", type: "BOOLEAN NOT NULL DEFAULT false" },
  { name: "showDiscord", type: "BOOLEAN NOT NULL DEFAULT false" },
  { name: "showReddit", type: "BOOLEAN NOT NULL DEFAULT false" },
  { name: "showYoutube", type: "BOOLEAN NOT NULL DEFAULT false" },
  { name: "showTiktok", type: "BOOLEAN NOT NULL DEFAULT false" },
  { name: "showWhatsApp", type: "BOOLEAN NOT NULL DEFAULT false" },
  { name: "paymentMethods", type: "TEXT NOT NULL DEFAULT '[]'" },
  { name: "currency", type: "TEXT NOT NULL DEFAULT 'PKR'" },
  { name: "logoUrl", type: "TEXT" },
  { name: "faviconUrl", type: "TEXT" },
  { name: "founderImageUrl", type: "TEXT" },
  { name: "founderBio", type: "TEXT" },
  { name: "primaryBrandColor", type: "TEXT NOT NULL DEFAULT '#059669'" },
  { name: "secondaryBrandColor", type: "TEXT NOT NULL DEFAULT '#d97706'" },
  { name: "currencySymbol", type: "TEXT NOT NULL DEFAULT 'Rs.'" },
  { name: "customCss", type: "TEXT NOT NULL DEFAULT ''" },
  { name: "tagline", type: "TEXT NOT NULL DEFAULT 'COMMAND YOUR BRAND UNIVERSE'" },
  { name: "emailFooterText", type: "TEXT" },
  { name: "invoiceHeaderText", type: "TEXT" },
  { name: "leadMagnetTitle", type: "TEXT" },
  { name: "leadMagnetDescription", type: "TEXT" },
  { name: "leadMagnetEmailSubject", type: "TEXT" },
  { name: "leadMagnetEmailBody", type: "TEXT" },
  { name: "leadMagnetPdfUrl", type: "TEXT" },
  { name: "leadMagnetSentCount", type: "INTEGER NOT NULL DEFAULT 0" },
  { name: "leadMagnetDownloadCount", type: "INTEGER NOT NULL DEFAULT 0" },
];

let platformColumnsRepaired = false;

/**
 * Ensures all columns exist in the PlatformSettings table.
 * Uses ALTER TABLE ADD COLUMN IF NOT EXISTS (PostgreSQL 9.6+).
 * Shared between admin and public settings routes so social icons
 * always appear on the landing page even before any admin action.
 */
export async function ensurePlatformSettingsColumns(): Promise<void> {
  if (platformColumnsRepaired) return;

  try {
    // Use direct pool (bypasses PgBouncer) for DDL - ALTER TABLE is DDL
    const pool = getDirectPool();
    for (const col of PLATFORM_SETTINGS_COLUMNS) {
      try {
        const sql = `ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}`;
        await pool.query(sql);
      } catch (colErr: unknown) {
        logger.warn('[Settings] Could not add column', { column: col.name, error: getErrorInfo(colErr).message });
      }
    }
    platformColumnsRepaired = true;
    logger.info('[Settings] PlatformSettings columns verified/added');
  } catch (err: unknown) {
    logger.error('[Settings] Column repair failed', { error: getErrorInfo(err).message });
  }
}

export function isTableNotFound(error: unknown): boolean {
  const { message: msg, code } = getErrorInfo(error);
  return (
    msg.includes("does not exist") ||
    msg.includes("Unknown table") ||
    msg.includes("relation \"") ||
    code === "P2021"
  );
}

let pushAttempted = false;
export async function tryDbPush(): Promise<boolean> {
  if (pushAttempted && schemaCreated) return true;
  pushAttempted = true;
  logger.info('[DB] Creating tables via direct pg (bypassing PgBouncer)');
  const result = await createAllTables();
  if (!result) {
    pushAttempted = false;
  }
  return result;
}

// Export the SQL for manual use
export { CREATE_ALL_TABLES_SQL };
