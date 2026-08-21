# Baseline and Supplier Migration Train

## Current repository state

- PR #7 owns the single immutable 40-table baseline, including `public.suppliers`.
- PR #7 performs no production migration and Vercel builds run no schema mutation.
- PR #6 must be rebased after PR #7. Its exact post-rebase migration history must
  be reviewed again; earlier SHAs are not release evidence.

## Required order

1. Make PR #7 code/CI green at one immutable SHA.
2. Capture fresh source-identified production catalog evidence and reconcile the
   nine previously reported Marketing tables.
3. Create, encrypt, store off-site, and restore-test a real production backup.
4. Rehearse baseline adoption on the restored clone with unchanged schema/data
   fingerprints and exact migration history.
5. Obtain human approval, then merge PR #7.
6. Rebase PR #6 on `main`; retain exactly one post-baseline Supplier forward migration.
7. Rehearse baseline+forward on empty DB, restored clone, and isolated staging.
8. Prove constraints, actual Prisma runtime-role CRUD, browser/Data API denial,
   rollback, and application smoke tests.
9. Obtain final production GO before any controlled `migrate resolve/deploy`.

## Safety invariants

- No `prisma db push` in any build/deploy path.
- No `prisma migrate dev` outside a disposable developer database.
- Never execute baseline `CREATE TABLE` statements on a populated database.
- Never use Preview against the Production database.
- A green Vercel deployment proves compilation only, not database compatibility.
