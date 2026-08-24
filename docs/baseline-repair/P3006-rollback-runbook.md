# P3006 Baseline Adoption and Recovery Runbook

Status: production execution is **not authorized** by this document.

The immutable migration `20260101000000_baseline` represents the approved
pre-forward-migration schema. Merging this repository change does not adopt the
baseline in an existing database. Production remains unchanged until every
release gate below is independently evidenced and a human approver gives GO.

## Non-negotiable rules

- Never run `prisma migrate dev` or `prisma db push` on Preview, staging, or production.
- Never execute baseline DDL on an existing populated database.
- Never point rehearsal scripts at production. Their guard intentionally rejects it.
- Use a direct or session-pooler connection on port 5432; never transaction-pooler port 6543.
- Remote rehearsal URLs must be parameter-free. The guarded wrapper internally
  adds Prisma's strict certificate mode and the reviewed pinned Supabase CA to
  both `DATABASE_URL` and `DIRECT_DATABASE_URL` before any Prisma child process.
- Keep Preview/staging and Production on distinct Supabase projects.
- Do not place database URLs, dumps, or production row data in GitHub artifacts.

## Path A: empty disposable database

This is an automated schema-replay proof only.

1. Start a clean PostgreSQL database.
2. Set `DATABASE_URL` and `DIRECT_DATABASE_URL` to that database.
3. Generate the isolated baseline-only Prisma bundle with
   `node scripts/baseline/prepare-baseline-only-prisma.cjs`.
4. Deploy that bundle and require clean status, then capture the catalog and
   compare it with the committed immutable baseline fixture.
5. Switch back to `prisma/schema.prisma`, deploy the complete repository
   migration train, and require clean status.
6. Run the complete repository deploy again and require a no-op.
7. Run the integration tests with zero skips.

The `Integration Tests` CI job proves the clean-database portion on PostgreSQL 16.
It does not prove production parity or backup recovery.

## Path B: populated schema without Prisma history

First rehearse on an isolated clone or synthetic populated database. Do not use
production for this step.

1. Restore/replay the 40-table application schema without `_prisma_migrations`.
2. Seed or restore FK-valid representative data.
3. Set the exact rehearsal allowlist and target-identity variables.
4. Run:

   `node scripts/baseline/guarded-migrate-resolve.cjs 20260101000000_baseline`

The wrapper fails unless all of these are true:

- target URL and connected PostgreSQL identity are the approved rehearsal target;
- `_prisma_migrations` is absent;
- representative data exists;
- the complete pre-resolve catalog matches the committed fixture;
- repository migration inventory is exactly the pinned baseline followed by
  `20260815_add_supplier_constraints_and_security`;
- before adoption, Prisma reports the baseline and forward migration pending;
- after resolve, schema and per-table data fingerprints are unchanged;
- exactly one clean baseline history row exists with the expected checksum;
- after adoption, Prisma reports only the exact Supplier forward migration
  pending;
- the wrapper applies that forward migration through `prisma migrate deploy`
  on the same populated target and requires clean status;
- application-data fingerprints remain unchanged, the only catalog delta is
  the two reviewed validated Supplier CHECK constraints, and the reviewed
  RLS/ACL posture is proved;
- history contains exactly the baseline plus forward rows with exact checksums;
- a second complete-repository `migrate deploy` is a no-op.

CI calls this a **Synthetic Adoption Proof**. It proves the two-phase migration
train on representative data, but it is not a restored-production-clone or
production-recovery proof. Its localhost fixture creates `anon`, `authenticated`,
and `service_role` as `NOLOGIN`, grants table and column access before the
forward deploy, and requires the migration to revoke every seeded privilege.

## Production evidence gate

Before any production `migrate resolve` or `migrate deploy`:

1. Use the trusted-main `Production Catalog Evidence` workflow, or run the same
   reviewed scripts from a pinned local checkout. Candidate PR code must never
   receive production secrets in pull-request CI.
2. Require a fresh read-only production catalog, explicit nine-Marketing-table
   presence report, exact source identity, SHA-256 manifest, and comparison report.
3. Take real `pg_dump -Fc` schema+data backups and the approved roles/globals
   export. Encrypt and store them off-site.
4. Restore those exact artifacts to a disposable database and compare complete
   schema plus per-table row counts/fingerprints.
5. Rehearse Path B on that restored clone.
6. Record a human approval and maintenance-window owner.

Only then may an operator bind Prisma's `DATABASE_URL` and `DIRECT_DATABASE_URL`
to the separately verified production target and mark the baseline applied. The
baseline SQL itself must not execute on the populated production database.

## Forward migration train

After PR #7 is merged and production baseline adoption is evidenced:

1. Rebase PR #6 onto the new `main`.
2. Confirm there is exactly one active baseline migration plus one post-baseline
   forward Supplier migration; no duplicate `CREATE TABLE suppliers` migration.
3. Replay baseline+forward on a clean disposable database.
4. Apply the baseline-history repair then forward migration on the restored clone.
5. Apply to isolated staging and prove real Prisma CRUD, constraints, grants/RLS
   posture, Data API denial, and rollback.
6. Obtain final human GO before production execution.

## Failure and rollback

- Before production action: stop; discard/rebuild rehearsal. Production impact is zero.
- Resolve-only failure: do not run baseline DDL. Preserve status/history/catalog
  evidence and investigate. A history-only correction must be independently reviewed.
- Forward-migration failure without data loss: ship a reviewed compensating forward
  migration; never edit an applied migration.
- Suspected corruption/data loss: enable maintenance mode and restore the exact
  encrypted, checksummed backup that already passed the disposable restore drill.

Restore commands and formats must match the artifacts actually created. For
custom-format dumps, use `pg_restore`; do not describe a baseline replay as a
backup restore.
