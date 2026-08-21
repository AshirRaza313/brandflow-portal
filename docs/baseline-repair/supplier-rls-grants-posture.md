# Supplier Table RLS and Grants Posture

Date: 2026-08-15 (updated)

## Current Posture (PR #7, baseline-only)

- Table: public.suppliers (created by immutable baseline migration
  20260101000000_baseline)
- RLS: Not enabled.
- Grants: the baseline intentionally preserves the captured pre-forward state.
  PR #6 is responsible for a separate, reviewed forward migration that revokes
  Supplier table and column privileges from browser/Data API roles.
- Runtime role: Prisma connects with the database connection user from
  DATABASE_URL. Exact role name NOT yet confirmed - resolved in staging
  rehearsal (see decision checkpoint below).

## Decision Checkpoint - Runtime Role Resolution

The policy SQL placeholder cannot be finalized without the actual runtime
role. Resolution procedure:

1. Isolated staging DB par Prisma se ek query chalao:
   SELECT current_user;
   (App route ya prisma studio se, production nahi.)
2. Recorded value: [PENDING: expected candidates - Supabase default owner
   `postgres`, ya dedicated app role agar banaya gaya]
3. Yeh value policy SQL mein substitute hone se pehle expert review hogi.

Agar runtime role table owner, superuser, ya `BYPASSRLS` role hai, ordinary
RLS policy tenant isolation enforce nahi karegi. `FORCE ROW LEVEL SECURITY`
ya no-policy posture bina dedicated runtime role aur per-transaction tenant
context ke Prisma CRUD ko break kar sakta hai. Is liye sirf `current_user`
match karne wali policy ko security boundary report nahi kiya jayega.

## Approved Interim Production Posture

- Organization authorization remains server-side in NextAuth + Prisma
  (`src/lib/supplier-access.ts`).
- `PUBLIC`, `anon`, and `authenticated` receive no Supplier table/column
  privileges after the PR #6 forward migration. `service_role` must also be
  explicitly reviewed because it normally bypasses RLS.
- RLS remains disabled unless a later, separate architecture change provides
  a dedicated non-owner runtime role, a trustworthy per-transaction tenant
  identifier, reviewed policies, and real-role integration evidence.
- This is Data API denial plus application-layer tenant authorization; it must
  not be described as database-enforced tenant RLS.

## Implementation Plan (PR #6, post-rebase)

Forward migration 20260815_add_supplier_constraints_and_security contains:

- ALTER TABLE suppliers ADD CONSTRAINT rating_check
- ALTER TABLE suppliers ADD CONSTRAINT status_check
- guarded revokes on Supplier table/columns for Data API roles
- an explicit pre/postcondition that RLS has not drifted on unexpectedly

Any future RLS migration is a separate security design, not a placeholder SQL
substitution. It must prove actual Prisma CRUD through the runtime connection,
tenant isolation under the exact connected role, and denial for every Data API
role that remains in scope before production deployment.
