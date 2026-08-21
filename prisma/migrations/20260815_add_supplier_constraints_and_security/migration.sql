-- Post-baseline Supplier hardening migration.
--
-- Preconditions:
--   * 20260101000000_baseline has created public.suppliers.
--   * this migration is run by the reviewed DIRECT_DATABASE_URL role.
--   * RLS is still disabled. The application uses a server-side Prisma
--     connection and does not attach an end-user Supabase JWT/tenant claim to
--     each database transaction, so enabling RLS without a verified runtime
--     role/policy would either be ineffective (owner bypass) or break Prisma.
--
-- Security posture after this migration:
--   * invalid rating/status values are rejected by validated CHECK constraints;
--   * PUBLIC, anon, authenticated, and service_role cannot access the table
--     directly;
--   * server-side tenant authorization remains in supplier-access.ts;
--   * RLS remains a separate, fail-closed migration after the exact Prisma
--     runtime role has been proved in staging.

-- Fail before taking a table lock if the baseline shape or current security
-- posture is not the one reviewed for this migration.
--
-- Keep every schema and ACL mutation in one PostgreSQL DO statement. A failed
-- preflight, DDL operation, privilege change, or postflight check therefore
-- rolls back the statement atomically while leaving Prisma able to record the
-- original error. Timeout settings are temporary session guards for that DO
-- and are reset after a successful statement.
SET lock_timeout = '10s';
SET statement_timeout = '5min';

DO $supplier_migration$
DECLARE
  supplier_oid oid := to_regclass('public.suppliers');
  supplier_kind "char";
  supplier_rls_enabled boolean;
  supplier_rls_forced boolean;
  invalid_rating_count bigint;
  invalid_status_count bigint;
  column_problem_count integer;
  target_role text;
  target_privilege text;
  target_column text;
BEGIN
  IF supplier_oid IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42P01',
      MESSAGE = 'Supplier hardening preflight failed: public.suppliers does not exist';
  END IF;

  SELECT c.relkind, c.relrowsecurity, c.relforcerowsecurity
    INTO supplier_kind, supplier_rls_enabled, supplier_rls_forced
  FROM pg_catalog.pg_class AS c
  WHERE c.oid = supplier_oid;

  IF supplier_kind NOT IN ('r', 'p') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42809',
      MESSAGE = format(
        'Supplier hardening preflight failed: public.suppliers has relation kind %s',
        supplier_kind
      );
  END IF;

  IF supplier_rls_enabled OR supplier_rls_forced OR EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy
    WHERE polrelid = supplier_oid
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Supplier hardening preflight failed: unexpected RLS state or policy exists',
      HINT = 'Review the existing policies and runtime database role; do not overwrite security drift.';
  END IF;

  IF current_user IN ('anon', 'authenticated', 'service_role') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = format(
        'Supplier hardening preflight failed: unsafe migration executor role %I',
        current_user
      );
  END IF;

  -- Validate the columns used by the constraints and tenant boundary. This
  -- catches a wrong/partial baseline before any DDL or privilege change.
  SELECT count(*)
    INTO column_problem_count
  FROM (
    VALUES
      ('id',              'text',    true),
      ('organization_id', 'text',    true),
      ('status',          'text',    true),
      ('rating',          'integer', false)
  ) AS expected(column_name, formatted_type, is_not_null)
  LEFT JOIN pg_catalog.pg_attribute AS attribute
    ON attribute.attrelid = supplier_oid
   AND attribute.attname = expected.column_name
   AND attribute.attnum > 0
   AND NOT attribute.attisdropped
  WHERE attribute.attname IS NULL
     OR pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
          <> expected.formatted_type
     OR attribute.attnotnull <> expected.is_not_null;

  IF column_problem_count <> 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '42804',
      MESSAGE = format(
        'Supplier hardening preflight failed: %s required column definition(s) differ from the approved baseline',
        column_problem_count
      );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = supplier_oid
      AND conname IN ('suppliers_rating_check', 'suppliers_status_check')
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42710',
      MESSAGE = 'Supplier hardening preflight failed: a target constraint name already exists',
      HINT = 'Compare the live constraint definition with this migration; do not silently replace it.';
  END IF;

  SELECT count(*)
    INTO invalid_rating_count
  FROM public.suppliers
  WHERE rating IS NOT NULL
    AND (rating < 1 OR rating > 5);

  IF invalid_rating_count <> 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Supplier hardening preflight failed: invalid rating data exists',
      DETAIL = format('%s supplier row(s) have a rating outside 1..5', invalid_rating_count),
      HINT = 'Correct and review the invalid rows before retrying prisma migrate deploy.';
  END IF;

  SELECT count(*)
    INTO invalid_status_count
  FROM public.suppliers
  WHERE status NOT IN ('active', 'inactive', 'blacklisted');

  IF invalid_status_count <> 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Supplier hardening preflight failed: invalid status data exists',
      DETAIL = format('%s supplier row(s) have an unsupported status', invalid_status_count),
      HINT = 'Correct and review the invalid rows before retrying prisma migrate deploy.';
  END IF;

-- NOT VALID separates constraint creation from validation, but this migration
-- deliberately keeps one atomic statement. PostgreSQL holds the ADD CONSTRAINT
-- ACCESS EXCLUSIVE lock until the statement completes, so production deploy
-- requires reviewed table-size, lock-wait, and maintenance-window evidence.
  EXECUTE '
    ALTER TABLE public.suppliers
      ADD CONSTRAINT suppliers_rating_check
      CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
      NOT VALID;
  ';

  EXECUTE '
    ALTER TABLE public.suppliers
      ADD CONSTRAINT suppliers_status_check
      CHECK (status IN (''active'', ''inactive'', ''blacklisted''))
      NOT VALID;
  ';

  EXECUTE '
    ALTER TABLE public.suppliers
      VALIDATE CONSTRAINT suppliers_rating_check;
  ';

  EXECUTE '
    ALTER TABLE public.suppliers
      VALIDATE CONSTRAINT suppliers_status_check;
  ';

-- Deny browser/Data API roles. Supplier access is Prisma-only; the Supabase
-- service-role client is used for Storage, not Supplier SQL. PUBLIC is always
-- present. Supabase roles are conditional so the migration also replays on
-- disposable PostgreSQL.
  EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.suppliers FROM PUBLIC';

  FOR target_column IN
    SELECT attribute.attname
    FROM pg_catalog.pg_attribute AS attribute
    WHERE attribute.attrelid = 'public.suppliers'::regclass
      AND attribute.attnum > 0
      AND NOT attribute.attisdropped
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES (%I) ON TABLE public.suppliers FROM PUBLIC',
      target_column
    );
  END LOOP;

  FOREACH target_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_roles
      WHERE rolname = target_role
    ) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public.suppliers FROM %I',
        target_role
      );

      FOR target_column IN
        SELECT attribute.attname
        FROM pg_catalog.pg_attribute AS attribute
        WHERE attribute.attrelid = 'public.suppliers'::regclass
          AND attribute.attnum > 0
          AND NOT attribute.attisdropped
      LOOP
        EXECUTE format(
          'REVOKE ALL PRIVILEGES (%I) ON TABLE public.suppliers FROM %I',
          target_column,
          target_role
        );
      END LOOP;
    END IF;
  END LOOP;

-- Postconditions are part of the atomic statement: any incomplete constraint
-- or effective Data API privilege rolls the entire migration back.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = supplier_oid
      AND conname IN ('suppliers_rating_check', 'suppliers_status_check')
      AND NOT convalidated
  ) OR (
    SELECT count(*)
    FROM pg_catalog.pg_constraint
    WHERE conrelid = supplier_oid
      AND conname IN ('suppliers_rating_check', 'suppliers_status_check')
  ) <> 2 THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Supplier hardening postflight failed: both CHECK constraints must exist and be validated';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute AS attribute
    CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS acl
    WHERE attribute.attrelid = supplier_oid
      AND attribute.attnum > 0
      AND NOT attribute.attisdropped
      AND acl.grantee = 0
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Supplier hardening postflight failed: PUBLIC still has a column privilege';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.aclexplode(
      COALESCE(
        (SELECT relacl FROM pg_catalog.pg_class WHERE oid = supplier_oid),
        pg_catalog.acldefault(
          'r',
          (SELECT relowner FROM pg_catalog.pg_class WHERE oid = supplier_oid)
        )
      )
    ) AS acl
    WHERE acl.grantee = 0
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Supplier hardening postflight failed: PUBLIC still has a table privilege';
  END IF;

  FOREACH target_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_roles
      WHERE rolname = target_role
    ) THEN
      FOREACH target_privilege IN ARRAY ARRAY[
        'SELECT', 'INSERT', 'UPDATE', 'DELETE',
        'TRUNCATE', 'REFERENCES', 'TRIGGER'
      ]
      LOOP
        IF pg_catalog.has_table_privilege(
          target_role,
          supplier_oid,
          target_privilege
        ) THEN
          RAISE EXCEPTION USING
            ERRCODE = '42501',
            MESSAGE = format(
              'Supplier hardening postflight failed: role %I retains effective %s privilege',
              target_role,
              target_privilege
            ),
            HINT = 'Inspect role memberships/default grants; do not bypass this check with a broad policy.';
        END IF;
      END LOOP;

      IF current_setting('server_version_num')::integer >= 170000 THEN
        IF pg_catalog.has_table_privilege(
          target_role,
          supplier_oid,
          'MAINTAIN'
        ) THEN
          RAISE EXCEPTION USING
            ERRCODE = '42501',
            MESSAGE = format(
              'Supplier hardening postflight failed: role %I retains effective MAINTAIN privilege',
              target_role
            );
        END IF;
      END IF;

      FOR target_column IN
        SELECT attribute.attname
        FROM pg_catalog.pg_attribute AS attribute
        WHERE attribute.attrelid = supplier_oid
          AND attribute.attnum > 0
          AND NOT attribute.attisdropped
      LOOP
        FOREACH target_privilege IN ARRAY ARRAY[
          'SELECT', 'INSERT', 'UPDATE', 'REFERENCES'
        ]
        LOOP
          IF pg_catalog.has_column_privilege(
            target_role,
            supplier_oid,
            target_column,
            target_privilege
          ) THEN
            RAISE EXCEPTION USING
              ERRCODE = '42501',
              MESSAGE = format(
                'Supplier hardening postflight failed: role %I retains effective %s privilege on column %I',
                target_role,
                target_privilege,
                target_column
              );
          END IF;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;

  IF (
    SELECT relrowsecurity OR relforcerowsecurity
    FROM pg_catalog.pg_class
    WHERE oid = supplier_oid
  ) OR EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy
    WHERE polrelid = supplier_oid
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Supplier hardening postflight failed: this migration must not silently enable RLS';
  END IF;
END
$supplier_migration$;

RESET lock_timeout;
RESET statement_timeout;
