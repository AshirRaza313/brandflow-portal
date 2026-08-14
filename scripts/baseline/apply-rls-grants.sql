-- Server-compatible RLS/grants for Valtriox
-- IMPORTANT: Valtriox uses NextAuth + Prisma server-side, NOT Supabase Auth identities.
-- Do NOT use auth.uid() policy. This script is for PostgreSQL roles only.

-- Replace <prisma_runtime_role> with the actual database role used by Prisma.
-- Usually this is the owner role or a dedicated app role, for example: postgres

-- Revoke unnecessary access from Supabase Auth roles
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON SCHEMA public FROM anon, authenticated;

-- Grant required access to the Prisma runtime role
GRANT USAGE ON SCHEMA public TO <prisma_runtime_role>;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO <prisma_runtime_role>;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO <prisma_runtime_role>;

-- Ensure future tables get the same grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO <prisma_runtime_role>;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO <prisma_runtime_role>;
