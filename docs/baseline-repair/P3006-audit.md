# P3006 Baseline Migration Audit

Date: 2026-08-14
Branch: chore/baseline-repair-p3006

## Orphaned Migration Inventory

- 20250629_add_order_counter/migration.sql
  - Change: ALTER TABLE Organization ADD COLUMN orderCounter INTEGER NOT NULL DEFAULT 0
  - Verify: information_schema.columns table Organization column orderCounter
- 20250629_fix_invitation_fk/migration.sql
  - Change: UPDATE ValtrioxTeamInvitation SET invitedBy = NULL where not matching member id
  - Verify: information_schema.columns table ValtrioxTeamInvitation column invitedBy exists
- 20260605_add_platform_document/migration.sql
  - Change: CREATE TABLE PlatformDocument plus indexes
  - Verify: information_schema.tables table PlatformDocument exists
- 20260615_add_otp_fields/migration.sql
  - Change: ALTER TABLE User ADD COLUMN otpCode, otpExpires, otpVerified
  - Verify: information_schema.columns table User columns otpCode, otpExpires, otpVerified

## Current State

The historical audit reported no `_prisma_migrations` table. That statement must
be re-verified in the fresh, source-identified production evidence session before
any adoption action. The repository alone cannot prove current production state.

The SQL represented by the four legacy folders may already exist in production
through earlier manual changes or `prisma db push`; exact catalog parity, not the
folder names, is the required adoption precondition.

## Archive State

- The four legacy directories are preserved under `prisma/migrations-archive/`.
- Active migration history contains only the immutable baseline and lock file.
- Archived SQL must not be reintroduced into active migration history after the
  baseline is adopted.

## Verification SQL

Run after restoring baseline on staging:

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'Organization'
AND column_name = 'orderCounter';
