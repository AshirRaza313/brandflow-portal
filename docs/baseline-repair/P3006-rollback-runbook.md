# P3006 Rollback Runbook

Date: 2026-08-14
Branch: chore/baseline-repair-p3006

## Pre-requisites

- Direct/session connection to PostgreSQL on port 5432, not transaction pooler 6543.
- Off-site roles backup available and encrypted.
- Schema-only baseline dump available.
- Disposable database for rehearsal.

## Step 1: Identify current migration state

Run:

npx prisma migrate status --schema prisma/schema.prisma

Note the applied and pending migrations.

## Step 2: Restore roles backup

If roles changed or lost, restore from off-site encrypted backup:

gpg --decrypt valtriox-roles-YYYYMMDD.sql.gpg | psql "postgresql://postgres:password@host:5432/postgres" -f -

## Step 3: Restore schema to known baseline

Option A: Restore schema-only dump

psql "postgresql://postgres:password@host:5432/staging-db" -f baseline-schema.sql

Option B: Re-run baseline migration

npx prisma migrate deploy --schema prisma/schema.prisma

Choose based on whether you want immutable baseline replay or migration framework.

## Step 4: Replay baseline on disposable DB first

Always test on an empty disposable database before applying to staging or production.

Create disposable DB:
createdb valtriox_baseline_rehearsal

Apply baseline:
psql -d valtriox_baseline_rehearsal -f prisma/migrations/20260101000000_baseline/migration.sql

Apply forward migration:
psql -d valtriox_baseline_rehearsal -f prisma/migrations/20260814_add_suppliers_table/migration.sql

Verify tables and constraints.

## Step 5: Compensating migration for supplier constraints (if required)

If supplier CHECK constraints need to be removed, apply a compensating migration:

ALTER TABLE "public"."suppliers" DROP CONSTRAINT IF EXISTS "suppliers_rating_check";
ALTER TABLE "public"."suppliers" DROP CONSTRAINT IF EXISTS "suppliers_status_check";

Then resolve migration state:

npx prisma migrate resolve --schema prisma/schema.prisma --applied "20260814_add_suppliers_table"

## Step 6: Validate application

Run the app against the restored database and confirm login, suppliers list, create, update, delete, and stats work.

## Step 7: Monitor and record

Record the exact commands used, before/after state, and any errors in an incident log.
