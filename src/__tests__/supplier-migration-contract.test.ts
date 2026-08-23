import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "prisma/migrations/20260815_add_supplier_constraints_and_security/migration.sql",
  ),
  "utf8",
);
const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/pr-validation.yml"),
  "utf8",
).replace(/\r\n?/g, "\n");
const baselineWorkflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/baseline-pr-validation.yml"),
  "utf8",
).replace(/\r\n?/g, "\n");
const integrationScript = readFileSync(
  resolve(process.cwd(), "scripts/test-supplier-forward-migration.cjs"),
  "utf8",
);
const runbook = readFileSync(
  resolve(process.cwd(), "docs/supplier-forward-migration-runbook.md"),
  "utf8",
);
const guardedBaselineResolve = readFileSync(
  resolve(process.cwd(), "scripts/baseline/guarded-migrate-resolve.cjs"),
  "utf8",
);
const prepareBaselineOnly = readFileSync(
  resolve(process.cwd(), "scripts/baseline/prepare-baseline-only-prisma.cjs"),
  "utf8",
);
const preparePathBCiRoles = readFileSync(
  resolve(process.cwd(), "scripts/baseline/prepare-pathb-ci-roles.cjs"),
  "utf8",
);
const guardedSupplierRecovery = readFileSync(
  resolve(
    process.cwd(),
    "scripts/baseline/guarded-supplier-migration-recovery.cjs",
  ),
  "utf8",
);
const captureFullCatalog = readFileSync(
  resolve(process.cwd(), "scripts/baseline/capture-full-catalog.cjs"),
  "utf8",
);
const supplierRecoveryClassifier = readFileSync(
  resolve(
    process.cwd(),
    "scripts/baseline/classify-supplier-migration-recovery.cjs",
  ),
  "utf8",
);
const supplierRecoveryIntegration = readFileSync(
  resolve(
    process.cwd(),
    "tests/baseline/run-supplier-recovery-integration.cjs",
  ),
  "utf8",
);
const gitAttributes = readFileSync(
  resolve(process.cwd(), ".gitattributes"),
  "utf8",
);

describe("Supplier forward migration contract", () => {
  it("is one atomic forward-only statement with fail-closed limits", () => {
    expect(migration.match(/^DO \$supplier_migration\$$/gm)).toHaveLength(1);
    expect(migration.match(/^DO \$[a-z_]+\$$/gm)).toHaveLength(1);
    expect(migration).not.toMatch(/^BEGIN;$/gm);
    expect(migration).not.toMatch(/^COMMIT;$/gm);
    expect(migration).toContain("SET lock_timeout = '10s'");
    expect(migration).toContain("SET statement_timeout = '5min'");
    expect(migration).toContain("RESET lock_timeout;");
    expect(migration).toContain("RESET statement_timeout;");
    expect(migration).not.toMatch(/\bCREATE\s+TABLE\s+[^;]*suppliers/i);
  });

  it("fails closed on baseline drift and invalid existing data", () => {
    expect(migration).toContain("to_regclass('public.suppliers')");
    expect(migration).toContain("pg_catalog.format_type");
    expect(migration).toContain("rating < 1 OR rating > 5");
    expect(migration).toContain(
      "status NOT IN ('active', 'inactive', 'blacklisted')",
    );
    expect(migration).toContain("unexpected RLS state or policy exists");
    expect(migration).toContain("a target constraint name already exists");
  });

  it("adds both checks as NOT VALID and validates them atomically", () => {
    for (const name of [
      "suppliers_rating_check",
      "suppliers_status_check",
    ]) {
      expect(migration).toMatch(
        new RegExp(`ADD CONSTRAINT ${name}[\\s\\S]*?NOT VALID;`),
      );
      expect(migration).toContain(`VALIDATE CONSTRAINT ${name};`);
    }
    expect(migration).toContain("AND NOT convalidated");
  });

  it("revokes and verifies table and column access without inventing an RLS policy", () => {
    expect(migration).toContain(
      "REVOKE ALL PRIVILEGES ON TABLE public.suppliers FROM PUBLIC",
    );
    expect(migration).toContain(
      "ARRAY['anon', 'authenticated', 'service_role']",
    );
    expect(migration).toContain("REVOKE ALL PRIVILEGES (%I)");
    expect(migration).toContain("pg_catalog.has_table_privilege");
    expect(migration).toContain("pg_catalog.has_column_privilege");
    expect(migration).toContain(">= 170000");
    expect(migration).not.toContain(">= 160000");
    expect(integrationScript).toContain(">= 170000");
    expect(migration).not.toMatch(
      /^\s*ALTER\s+TABLE\s+[^;]*\s+(?:ENABLE|FORCE)\s+ROW\s+LEVEL\s+SECURITY\s*;/gim,
    );
    expect(migration).not.toMatch(/^\s*CREATE\s+POLICY\b/gim);
  });

  it("keeps the PostgreSQL proof and recovery procedure reviewable", () => {
    expect(workflow).toContain(
      "name: Supplier Migration Synthetic SQL/ACL Contract (PG ${{ matrix.postgres }})",
    );
    expect(workflow).toContain("postgres: [16, 17]");
    expect(workflow).toContain("image: postgres:${{ matrix.postgres }}");
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).toContain("npm run test:migration:supplier");
    expect(workflow).toContain("needs: supplier-migration");
    const buildStart = workflow.indexOf("  build:");
    const gate = workflow.indexOf(
      "      - name: Enforce Supplier migration contract dependency",
    );
    const syntheticJob = workflow.indexOf("  supplier-migration:");
    expect(buildStart).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(buildStart);
    expect(gate).toBeLessThan(syntheticJob);
    expect(workflow).toContain("if: ${{ always() }}");
    expect(workflow).toContain(
      "if: ${{ needs.supplier-migration.result != 'success' }}",
    );
    expect(runbook).toContain("Required evidence before production");
    expect(runbook).toContain("--rolled-back");
    expect(runbook).toContain("post-`COMMIT` failure case");
    expect(runbook).toContain("exact-target `--applied`");
    expect(runbook).toContain("Raw `prisma migrate resolve` is forbidden");
    expect(baselineWorkflow).toContain(
      "node tests/baseline/run-supplier-recovery-validation.cjs",
    );
    expect(guardedSupplierRecovery).toContain(
      'validateRehearsalUrl("REHEARSAL_DATABASE_URL")',
    );
    expect(guardedSupplierRecovery).toContain(
      "SUPPLIER_RECOVERY_PRESTATE_SHA256",
    );
    expect(guardedSupplierRecovery).toContain(
      'strictPrismaConnectionUrl(',
    );
    expect(supplierRecoveryClassifier).toContain(
      'allowedResolveFlag: "--rolled-back"',
    );
    expect(supplierRecoveryClassifier).toContain(
      'allowedResolveFlag: "--applied"',
    );
    expect(baselineWorkflow).toContain(
      "node tests/baseline/run-supplier-recovery-integration.cjs",
    );
    expect(supplierRecoveryIntegration).toContain(
      'recover(scenario, "resolve-rolled-back-1", "--rolled-back", prestate1)',
    );
    expect(supplierRecoveryIntegration).toContain(
      'recover(scenario, "resolve-applied", "--applied", prestate)',
    );
    expect(supplierRecoveryIntegration).toContain(
      "proveExactMigrationFailure(pool, scenario, attempt)",
    );
    expect(supplierRecoveryIntegration).toContain(
      'failureMode: "prisma_p3018_with_history_log"',
    );
    expect(baselineWorkflow).toContain(
      "failed-deploy-$attempt-proof.json",
    );
    expect(gitAttributes).toContain(
      "prisma/migrations/**/migration.sql text eol=lf",
    );
    expect(guardedSupplierRecovery).toContain(
      "Migration SQL must be checked out with LF line endings",
    );
    expect(guardedSupplierRecovery).toContain("repositoryFileSha256(WRAPPER_PATH)");
    expect(guardedSupplierRecovery).toContain(
      "SET LOCAL idle_in_transaction_session_timeout = '10min'",
    );
    expect(guardedSupplierRecovery).toContain(
      'require.resolve("prisma/build/index.js")',
    );
    expect(guardedSupplierRecovery).toContain("resolve-command-result.json");
    expect(guardedSupplierRecovery).toContain(
      "recovery-failure-after-resolve.json",
    );
    expect(guardedSupplierRecovery).toContain("requires_fresh_reclassification");
    expect(guardedSupplierRecovery).toContain(
      "database schema is up to date!",
    );
    expect(guardedSupplierRecovery).toContain("files_sha256");
    expect(captureFullCatalog).toContain("statementTimeoutMs");
    expect(captureFullCatalog).toContain("query_timeout: queryTimeoutMs");
    expect(baselineWorkflow).toContain("timeout-minutes: 20");
    expect(baselineWorkflow).toContain(
      "Upload clearly labeled Supplier recovery failure diagnostics",
    );
    expect(runbook).toContain("perform a fresh classification");
    expect(runbook).toContain("returns exit code `0`");
  });

  it("separates baseline catalog proof, then runs the populated forward train", () => {
    expect(prepareBaselineOnly).toContain(
      'const BASELINE_MIGRATION = "20260101000000_baseline"',
    );
    expect(prepareBaselineOnly).toContain(
      "Baseline-only Prisma bundle contains an unexpected migration",
    );
    expect(baselineWorkflow).toContain(
      "npx prisma migrate deploy --schema backups/baseline-only-prisma/schema.prisma",
    );
    expect(baselineWorkflow).toContain(
      "Apply full repository migration train via Prisma",
    );
    expect(guardedBaselineResolve).toContain(
      'const FORWARD_MIGRATION = "20260815_add_supplier_constraints_and_security"',
    );
    expect(guardedBaselineResolve).toContain(
      'require.resolve("prisma/build/index.js")',
    );
    expect(guardedBaselineResolve).toContain(
      "spawnSync(\n    process.execPath",
    );
    expect(guardedBaselineResolve).toContain("PRISMA_CHILD_TIMEOUT_MS");
    expect(guardedBaselineResolve).toContain("result.error");
    expect(guardedBaselineResolve).toContain("result.signal");
    expect(guardedBaselineResolve).toContain(
      "target state must be freshly verified",
    );
    expect(guardedBaselineResolve).not.toContain("npx.cmd");
    expect(guardedBaselineResolve).not.toContain("PATH_B_PRISMA_SCHEMA");
    expect(
      baselineWorkflow.match(/Prepare isolated baseline-only Prisma history/g),
    ).toHaveLength(1);
    expect(baselineWorkflow).not.toContain("PATH_B_PRISMA_SCHEMA");
    expect(guardedBaselineResolve).toContain(
      'runPrismaStatus("before-forward")',
    );
    expect(guardedBaselineResolve).toContain(
      'runPrismaDeploy("forward-migration")',
    );
    expect(guardedBaselineResolve).toContain(
      '"supplier-forward-security.json"',
    );
    const resolveIndex = guardedBaselineResolve.indexOf('"--applied"');
    const forwardDeployIndex = guardedBaselineResolve.indexOf(
      'runPrismaDeploy("forward-migration")',
    );
    expect(resolveIndex).toBeGreaterThan(-1);
    expect(forwardDeployIndex).toBeGreaterThan(resolveIndex);
    expect(baselineWorkflow).toContain("baseline-adoption-history.json");
    expect(baselineWorkflow).toContain("baseline-migrate-resolve.txt");
    expect(baselineWorkflow).toContain("after-forward-catalog-delta.txt");
    expect(baselineWorkflow).toContain(
      "supplier-privileges-before-forward.json",
    );
    expect(baselineWorkflow).toContain(
      "node scripts/baseline/prepare-pathb-ci-roles.cjs",
    );
    expect(preparePathBCiRoles).toContain(
      "allowed only on the exact GitHub CI localhost target",
    );
    expect(preparePathBCiRoles).toContain(
      "TO anon, authenticated, service_role",
    );
    expect(guardedBaselineResolve).toContain(
      "Required Supplier denial role is absent",
    );
  });
});
