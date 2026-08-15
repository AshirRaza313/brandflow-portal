# P3006 Rollback Runbook

Date: 2026-08-15

## Applicable Migrations

- Baseline migration: `20260101000000_baseline` (immutable, full schema including suppliers)
- Forward migration (PR #6 after rebase): supplier constraints and grants only

## Rollback Procedure

### Step 1: Identify current migration state

```bash
npx prisma migrate status --schema prisma/schema.prisma