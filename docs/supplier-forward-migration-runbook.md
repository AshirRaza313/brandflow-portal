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
constraints, ACL denials, owner CRUD, and transactional failure behavior. It
is not a `prisma migrate deploy` rehearsal, not a restored-clone proof, and not
production recovery evidence. The required `Build` check fails closed unless
both matrix entries pass.

## Locking and maintenance window

`ADD CONSTRAINT ... NOT VALID` separates creation from validation, but the
explicit transaction is intentionally atomic and PostgreSQL retains its
`ACCESS EXCLUSIVE` lock until `COMMIT`. Before staging or production, capture
the Supplier table size/row count, observe lock wait and execution duration on
the restored clone, check for long-running transactions, and approve a bounded
maintenance window. Do not describe this migration as a low-lock or online
deploy.

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

The migration is one explicit transaction. It fails and rolls everything back
when:

- the table or required baseline columns differ;
- either target constraint name already exists;
- invalid rating/status data exists;
- RLS has drifted to enabled/forced or any unexpected policy exists;
- a constraint is not validated; or
- `PUBLIC`, `anon`, `authenticated`, or `service_role` retains an effective
  table/column privilege.

Do not choose either `prisma migrate resolve` mode until the database state is
classified. Prisma can retain a failed migration-history row even though
PostgreSQL rolled the SQL transaction back. Correct the cause and prove whether
any constraints or privilege changes survived. After PR #7 is merged and this
branch is rebased, exact-target recovery wrappers for the classified
`--rolled-back` and `--applied` cases must be implemented, reviewed, and tested
before any recovery. Those wrappers do not exist in this branch yet.
Raw `prisma migrate resolve` is forbidden. Production also requires a fresh
human GO for recovery.

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

- If the SQL transaction rolled back, neither new constraint exists and the
  pre-migration grants remain. Only the not-yet-built, reviewed
  `--rolled-back` wrapper may repair history before a retry.
- If every SQL postcondition exists but history is unfinished, do not rerun the
  SQL and do not mark it rolled back. A separate exact-target `--applied`
  finalization path must be implemented and reviewed after the PR #7 rebase,
  with exact migration checksum and restored-clone proof.
- Any mixed/partial schema state contradicts the atomic transaction. Stop the
  release and investigate; neither resolve mode is authorized.

## Compensating rollback

Prisma migrations are immutable and do not run down migrations. If a reviewed
emergency decision requires removing only the two data constraints, create a
new forward compensating migration containing:

```sql
BEGIN;
SET LOCAL lock_timeout = '10s';
ALTER TABLE public.suppliers
  DROP CONSTRAINT IF EXISTS suppliers_rating_check;
ALTER TABLE public.suppliers
  DROP CONSTRAINT IF EXISTS suppliers_status_check;
COMMIT;
```

Keep the `PUBLIC`/`anon`/`authenticated`/`service_role` revokes. Never
compensate with `GRANT ALL`, never disable an independently added RLS policy,
and never edit an already-applied migration. If the application runtime
genuinely needs a new database role, grant only `SELECT`, `INSERT`, `UPDATE`,
and `DELETE` to that reviewed role in a separate forward migration and test it
first on staging.
