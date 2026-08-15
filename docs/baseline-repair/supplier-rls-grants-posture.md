# Supplier Table RLS and Grants Posture

Date: 2026-08-15 (updated)

## Current Posture (PR #7, baseline-only)

- Table: public.suppliers (created by immutable baseline migration
  20260101000000_baseline)
- RLS: Not enabled.
- Grants: anon and authenticated have no privileges on suppliers (revoked
  via PR #6 forward migration 20260815_add_supplier_constraints_and_security
  after rebase).
- Runtime role: Prisma connects with the database connection user from
  DATABASE_URL. Exact role name NOT yet confirmed - resolved in staging
  rehearsal (see decision checkpoint below).

## Decision Checkpoint - Runtime Role Resolution (Required Before Policy)

The policy SQL placeholder cannot be finalized without the actual runtime
role. Resolution procedure:

1. Isolated staging DB par Prisma se ek query chalao:
   SELECT current_user;
   (App route ya prisma studio se, production nahi.)
2. Recorded value: [PENDING: expected candidates - Supabase default owner
   `postgres`, ya dedicated app role agar banaya gaya]
3. Yeh value policy SQL mein substitute hone se pehle expert review hogi.

Agar runtime role `postgres` (owner) hai, to RLS policy owner ko bhi cover
karni padegi kyunki PostgreSQL superuser/owner bypass alag hota hai - yeh
case explicitly review hoga. Alternative under consideration: dedicated
least-privilege app role for Prisma runtime.

## Required Final Posture for Production

- RLS ENABLE on public.suppliers.
- Policy: only the verified Prisma runtime role gets
  SELECT/INSERT/UPDATE/DELETE.
- No Supabase Auth identities, no auth.uid(). Authorization is enforced
  server-side in NextAuth + Prisma application layer
  (src/lib/supplier-access.ts).
- anon and authenticated roles: zero privileges on suppliers.

## Implementation Plan (PR #6, post-rebase)

Forward migration 20260815_add_supplier_constraints_and_security contains:

- ALTER TABLE suppliers ADD CONSTRAINT rating_check
- ALTER TABLE suppliers ADD CONSTRAINT status_check
- REVOKE all on suppliers FROM anon, authenticated

RLS enable + policy SIRF runtime role confirm hone ke baad alag forward
migration mein add hoga:

ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_server_full_access" ON "public"."suppliers"
  USING (current_user = '<resolved_runtime_role>')
  WITH CHECK (current_user = '<resolved_runtime_role>');

Verification: integration test jo resolved role se CRUD karta hai aur
anon/authenticated se denial karta hai.
