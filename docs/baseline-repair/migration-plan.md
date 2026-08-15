# Migration Plan for Supplier Constraints and Grants

Date: 2026-08-15 (updated)

## Current State

- PR #7 baseline-only contains immutable baseline migration with suppliers table.
- PR #6 duplicate CREATE TABLE supplier migration removed in 3ca0d64.
- PR #6 forward migration 20260815_add_supplier_constraints_and_security added
  in 3ca0d64 (constraints + anon/authenticated revoke).
- RLS enable + policy: pending runtime role resolution, see
  docs/baseline-repair/supplier-rls-grants-posture.md decision checkpoint.

## Required Final State

1. PR #7 baseline approved and merged to main.
2. PR #6 rebased on updated main.
3. Single immutable forward migration with rating_check, status_check,
   REVOKE for anon/authenticated (done in 3ca0d64).
4. RLS enable + server policy after runtime role verified on staging.
5. Full CI and isolated PostgreSQL tests pass.
6. Staging migrate deploy rehearsal.
7. Expert final approval, then production.

## Safety

- No prisma db push.
- No prisma migrate dev on staging/production.
- Production migration only after final approval.
