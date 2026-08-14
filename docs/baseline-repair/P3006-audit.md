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

Production database does not have `_prisma_migrations` table. The four orphaned migration directories were never applied through Prisma Migrate. Their SQL may or may not have been applied manually or through `prisma db push`.

## Archive Plan

- Do not delete the orphaned directories in this PR.
- Move them to an archive folder before marking the baseline as applied.
- After baseline replay and validation, archive folder can be removed in a follow-up cleanup PR.

## Verification SQL

Run after restoring baseline on staging:

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'Organization'
AND column_name = 'orderCounter';
