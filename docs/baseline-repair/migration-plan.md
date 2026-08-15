# Migration Plan for Supplier Constraints and Grants

Date: 2026-08-15

## Current State

- PR #7 baseline-only contains immutable baseline migration with suppliers table.
- Supplier constraints and grants are currently standalone scripts for rehearsal only.
- PR #6 still has duplicate CREATE TABLE supplier migration.

## Required Final State

1. PR #7 baseline approved and merged to main.
2. PR #6 rebased on updated main.
3. PR #6 duplicate CREATE TABLE supplier migration removed.
4. PR #6 adds a single immutable forward migration containing:
   - ALTER TABLE suppliers ADD CONSTRAINT rating_check
   - ALTER TABLE suppliers ADD CONSTRAINT status_check
   - REVOKE privileges from anon/authenticated
   - ENABLE ROW LEVEL SECURITY and server policy after runtime role verified
5. Full CI and isolated PostgreSQL tests pass.
6. Staging migrate deploy rehearsal.

## Safety

- No prisma db push.
- No prisma migrate dev on staging/production.
- Production migration only after final approval.