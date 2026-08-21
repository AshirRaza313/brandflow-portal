# Supplier forward migration runbook

Migration: `20260815_add_supplier_constraints_and_security`

This is a post-baseline forward migration. It must not be deployed before the
reviewed `20260101000000_baseline` migration and its production-history
adoption are complete.

## What the migration changes

- Adds and validates `suppliers_rating_check` (`NULL` or `1..5`).
- Adds and validates `suppliers_status_check` (`active`, `inactive`, or
  `blacklisted`).
- Revokes every table- and column-level privilege from `PUBLIC` and, when
  those roles exist, `anon`, `authenticated`, and `service_role`. Supplier SQL
  is Prisma-only; the service-role client remains available for Storage and
  receives no Supplier table access.
- Leaves RLS disabled and fails if RLS was unexpectedly enabled beforehand.

The last point is intentional. The application authorizes suppliers in
NextAuth/server code and Prisma opens a server-side database connection from
`DATABASE_URL`; it does not set a Supabase end-user JWT or organization claim
on every SQL transaction. Enabling RLS with no policy would break a
least-privilege runtime role, while enabling it on an owner connection without
`FORCE ROW LEVEL SECURITY` would be bypassed and give a false assurance. A
future RLS migration requires an exact, verified runtime database role and a
reviewed role/policy design.

The GitHub `Supplier Migration Synthetic SQL/ACL Contract` matrix executes this
SQL directly against isolated PostgreSQL 16 and 17 services. PostgreSQL 17
also exercises the version-gated `MAINTAIN` privilege check. It proves the SQL,
constraints, ACL denials, owner CRUD, and atomic-statement failure behavior. It
is not a `prisma migrate deploy` rehearsal, not a restored-clone proof, and not
production recovery evidence. The required `Build` check fails closed unless
both matrix entries pass.

## Locking and maintenance window

`ADD CONSTRAINT ... NOT VALID` separates creation from validation, but every
schema and ACL mutation is intentionally contained in one atomic PostgreSQL
`DO` statement. PostgreSQL retains its `ACCESS EXCLUSIVE` lock until that
statement completes. The migration sets a 10-second lock timeout and a
5-minute statement timeout before the `DO`, then resets both session settings
after a successful statement. Before staging or production,
capture the Supplier table size/row count, observe lock wait and execution
duration on the restored clone, check for long-running transactions, and
approve a bounded maintenance window. Do not describe this migration as a
low-lock or online deploy.

## Required evidence before production

1. Merge PR #7, rebase this branch on that exact `main`, and prove there is one
   baseline plus this one forward migration (no duplicate Supplier CREATE).
   On every target, stop if the rewritten forward migration name is already
   present in Prisma history; reconcile its checksum/state before doing
   anything else:

   ```sql
   SELECT migration_name, checksum, started_at, finished_at, rolled_back_at,
          applied_steps_count
   FROM public._prisma_migrations
   WHERE migration_name = '20260815_add_supplier_constraints_and_security';
   ```

   The expected pre-deploy result is zero rows.
   Migration SQL is byte-sensitive in Prisma history. The repository pins
   every `prisma/migrations/**/migration.sql` file to LF through
   `.gitattributes`; the guarded wrapper hard-fails a CRLF checkout instead of
   creating a platform-dependent checksum.
2. On a clean disposable PostgreSQL database, run `prisma migrate deploy` and
   the real Prisma Supplier CRUD/integration suite.
3. On a restored, isolated production clone, adopt the baseline history using
   the guarded PR #7 procedure, then run `prisma migrate deploy`.
4. Before deploy, record these count-only queries and resolve every non-zero
   result instead of editing the migration:

   ```sql
   SELECT count(*) AS invalid_rating_count
   FROM public.suppliers
   WHERE rating IS NOT NULL AND (rating < 1 OR rating > 5);

   SELECT count(*) AS invalid_status_count
   FROM public.suppliers
   WHERE status NOT IN ('active', 'inactive', 'blacklisted');
   ```

5. Through the staging application's actual Prisma `DATABASE_URL`, capture and
   review:

   ```sql
   SELECT current_user, session_user, current_database(), version();
   ```

   Through the migration/direct connection, also capture the table owner,
   current RLS flag, policies, and grants:

   ```sql
   SELECT
     pg_get_userbyid(c.relowner) AS table_owner,
     c.relrowsecurity,
     c.relforcerowsecurity
   FROM pg_class AS c
   WHERE c.oid = 'public.suppliers'::regclass;

   SELECT grantee, privilege_type, is_grantable
   FROM information_schema.table_privileges
   WHERE table_schema = 'public' AND table_name = 'suppliers'
   ORDER BY grantee, privilege_type;

   SELECT policyname, roles, cmd, qual, with_check
   FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'suppliers';
   ```

6. Prove staging Prisma can list, create, update, and delete an org-scoped
   Supplier. Prove the Supabase Data API `anon`, authenticated, and
   `service_role` contexts cannot select or mutate this table (Storage access
   is outside this Supplier-table check). Capture sanitized results; never
   commit connection strings, passwords, JWTs, or service keys.
7. Run `prisma migrate status`, take a verified backup/restore, and obtain the
   final human GO. Production remains on hold until all evidence is reviewed.

## Failure behavior

The migration has one atomic schema/ACL mutation statement. It fails and rolls
every mutation back when:

- the table or required baseline columns differ;
- either target constraint name already exists;
- invalid rating/status data exists;
- RLS has drifted to enabled/forced or any unexpected policy exists;
- a constraint is not validated; or
- `PUBLIC`, `anon`, `authenticated`, or `service_role` retains an effective
  table/column privilege.

Do not choose either `prisma migrate resolve` mode until the database state is
classified. Prisma can retain a failed migration-history row even though
PostgreSQL rolled the atomic statement back.
Raw `prisma migrate resolve` is forbidden.
CI must prove that a real invalid-rating deploy surfaces the target migration,
`P3018`, and SQLSTATE `23514`, and that the unresolved history log
retains the same failure before guarded recovery is allowed.

The branch includes a rehearsal-only, exact-target wrapper:

```text
scripts/baseline/guarded-supplier-migration-recovery.cjs
```

It reuses the rehearsal URL allowlist, connected-identity assertion, pinned
Supabase CA, strict Prisma child-process URL, exact repository migration train,
baseline fixture, and migration checksums. Production is rejected by the
shared safety guard. Capture the immutable prestate before the first forward
deploy:

```powershell
$env:SUPPLIER_RECOVERY_EVIDENCE_DIR = "backups/supplier-recovery-evidence/prestate-<UTC>-<exact-head>"
node scripts/baseline/guarded-supplier-migration-recovery.cjs --capture-prestate
```

For a remote rehearsal target, also set
`RECOVERY_MAINTENANCE_APPROVED=I_UNDERSTAND_WRITERS_AND_MIGRATORS_ARE_PAUSED`
only after application writers, scheduled jobs, and every other Prisma
migration operator are actually paused. The prestate capture hard-fails unless
both invalid Supplier counts are zero.

The evidence directory must be a new, unique direct child of
`backups/supplier-recovery-evidence`; the wrapper refuses to overwrite an
existing directory. Preserve its `supplier-forward-recovery-prestate.json`,
`prestate-receipt.json`, and `manifest.json` outside the target. If a deploy
later fails, point `SUPPLIER_RECOVERY_PRESTATE_FILE` at that exact prestate and
provide its printed `SUPPLIER_RECOVERY_PRESTATE_SHA256`. Use a second new
evidence directory for the recovery attempt, then invoke exactly one reviewed
mode. If classification proves that no migration SQL survived, use only:

```powershell
$env:SUPPLIER_RECOVERY_EVIDENCE_DIR = "backups/supplier-recovery-evidence/resolve-<UTC>-<exact-head>"
node scripts/baseline/guarded-supplier-migration-recovery.cjs --rolled-back
```

If classification instead proves that every reviewed SQL postcondition
committed while Prisma history remained unfinished, use only:

```powershell
$env:SUPPLIER_RECOVERY_EVIDENCE_DIR = "backups/supplier-recovery-evidence/resolve-<UTC>-<exact-head>"
node scripts/baseline/guarded-supplier-migration-recovery.cjs --applied
```

With Prisma 6.19.3, `prisma migrate status` returns exit code `0` and
`Database schema is up to date!` after either resolve mode. For
`--rolled-back`, that message does **not** mean the migration SQL was applied:
the exact history row must be marked rolled back, and the next separately
reviewed `prisma migrate deploy` must retry the migration. The wrapper requires
the exact clean post-resolve status, while the CI sequence separately proves
the rolled-back history transition, retry deploy, clean status, and no-op
second deploy.

The wrapper refuses a requested flag that does not match its classification.
It verifies the exact Git checkout/PR head/merge identity, exact migration-row
IDs and checksums, full per-table data fingerprints, the full catalog, Supplier
owner and complete non-Data-API ACL posture, and the requested Prisma history
transition. During classification and resolve it takes an advisory recovery
lock plus `SHARE ROW EXCLUSIVE` locks on every approved application table.
Pause application writers and every other migration operator for the entire
capture/deploy/recovery sequence; the wrapper deliberately does not lock
`_prisma_migrations`, because Prisma must update it through a separate
connection, and it revalidates history immediately before and after that
update. The maintenance transaction also has a bounded idle timeout. If a
Prisma child times out, is signalled, or exits ambiguously, treat the outcome as
unknown: stop, preserve the failure receipt, and perform a fresh classification
before any retry or resolve action. If a post-resolve verification fails, the
wrapper writes a non-success receipt with the freshly observed history and
requires the same reclassification; that receipt is never success evidence.
A reviewed retry may capture a fresh prestate only when all earlier
attempts are exact rolled-back history rows.

This wrapper is rehearsal proof only. A production recovery still requires
restored-clone evidence, a fresh production-specific human GO, and a separately
reviewed operator path; never substitute a rehearsal URL or weaken the
production rejection.

The PostgreSQL 16 integration job exercises both recovery branches: a real
atomic-statement migration failure followed by guarded `--rolled-back`, a clean
retry and idempotent deploy; and a synthetic post-`COMMIT`/unfinished-history
state followed by guarded `--applied`. Negative wrong-mode and partial-state
attempts must leave exact migration history unchanged. Every immutable evidence
directory and the integration manifest are uploaded with per-file hashes, the
exact PR head, tested merge SHA, run ID, and run attempt.

There is a separate post-`COMMIT` failure case: PostgreSQL can commit all SQL
successfully and the Prisma process can then fail before finalizing its
`_prisma_migrations` history row. Before choosing any recovery action, capture
the exact history row/checksum and verify both constraints, every ACL denial,
and RLS state:

```sql
SELECT migration_name, checksum, started_at, finished_at, rolled_back_at,
       applied_steps_count, logs
FROM public._prisma_migrations
WHERE migration_name = '20260815_add_supplier_constraints_and_security';
```

- If the atomic SQL statement rolled back, neither new constraint exists, the full
  catalog matches the approved baseline, and the Supplier security state
  matches the hashed prestate. Only the guarded `--rolled-back` mode may repair
  history before a separately reviewed retry.
- If every SQL postcondition exists but history is unfinished, do not rerun the
  SQL and do not mark it rolled back. The guarded exact-target `--applied` mode requires the
  exact two validated constraint definitions, exact catalog delta, every
  effective ACL denial, disabled/unforced RLS with zero policies, and the exact
  unfinished migration checksum before it can finalize rehearsal history.
- Any mixed/partial schema state contradicts the atomic statement. Stop the
  release and investigate; neither resolve mode is authorized.

## Compensating rollback

Prisma migrations are immutable and do not run down migrations. If a reviewed
emergency decision requires removing only the two data constraints, create a
new forward compensating migration containing:

```sql
SET lock_timeout = '10s';
SET statement_timeout = '5min';
DO $supplier_compensation$
BEGIN
  EXECUTE 'ALTER TABLE public.suppliers
    DROP CONSTRAINT IF EXISTS suppliers_rating_check';
  EXECUTE 'ALTER TABLE public.suppliers
    DROP CONSTRAINT IF EXISTS suppliers_status_check';
END
$supplier_compensation$;
RESET lock_timeout;
RESET statement_timeout;
```

Keep the `PUBLIC`/`anon`/`authenticated`/`service_role` revokes. Never
compensate with `GRANT ALL`, never disable an independently added RLS policy,
and never edit an already-applied migration. If the application runtime
genuinely needs a new database role, grant only `SELECT`, `INSERT`, `UPDATE`,
and `DELETE` to that reviewed role in a separate forward migration and test it
first on staging.
