"use strict";

const fs = require("fs");
const path = require("path");
const {
  APPROVED_TABLES,
  COLUMN_FIELDS,
  repositoryFileSha256,
  validateCatalog,
} = require("./catalog-contract.cjs");
const { SUPABASE_ROOT_CA_SHA256 } = require("./supabase-tls.cjs");

const BASELINE_MIGRATION_PATH = path.resolve(
  "prisma/migrations/20260101000000_baseline/migration.sql"
);
const FIXTURE_GENERATOR_PATH = path.resolve("scripts/baseline/normalize-baseline-fixture.cjs");
const CAPTURE_ENGINE_PATH = path.resolve("scripts/baseline/capture-full-catalog.cjs");
const PRODUCTION_CAPTURE_PATH = path.resolve("scripts/baseline/capture-production-catalog.cjs");
const SAFETY_GUARD_PATH = path.resolve("scripts/baseline/safety-guard.cjs");
const SUPABASE_TLS_PATH = path.resolve("scripts/baseline/supabase-tls.cjs");
const SUPABASE_ROOT_CA_PATH = path.resolve(
  "scripts/baseline/certs/supabase-root-2021-ca.pem"
);

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function compareNamedItems(kind, table, productionItems, rehearsalItems, fields, diffs) {
  const production = new Map(productionItems.map((item) => [item.name, item]));
  const rehearsal = new Map(rehearsalItems.map((item) => [item.name, item]));
  const names = new Set([...production.keys(), ...rehearsal.keys()]);
  for (const name of [...names].sort()) {
    if (!production.has(name)) {
      diffs.push(`${kind}_MISSING_IN_PRODUCTION: ${table}.${name}`);
      continue;
    }
    if (!rehearsal.has(name)) {
      diffs.push(`${kind}_MISSING_IN_REHEARSAL: ${table}.${name}`);
      continue;
    }
    for (const field of fields) {
      if (!sameValue(production.get(name)[field], rehearsal.get(name)[field])) {
        diffs.push(`${kind}_${field.toUpperCase()}_DIFF: ${table}.${name}`);
      }
    }
  }
}

function validateCatalogExpectation(label, catalog, expectation = {}) {
  const errors = [];
  const provenance = catalog && catalog._provenance;
  if (!provenance || typeof provenance !== "object") return errors;
  if (expectation.sourceKind && provenance.source_kind !== expectation.sourceKind) {
    errors.push(
      `PROVENANCE_SOURCE_KIND_MISMATCH: ${label} expected ${expectation.sourceKind}, got ${provenance.source_kind}`
    );
  }
  if (expectation.projectRef && provenance.project_ref !== expectation.projectRef) {
    errors.push(
      `PROVENANCE_PROJECT_REF_MISMATCH: ${label} expected ${expectation.projectRef}, got ${provenance.project_ref}`
    );
  }
  const actualHead = provenance.source_kind === "versioned_baseline_fixture"
    ? provenance.source_fixture_commit_sha
    : provenance.head_sha;
  if (expectation.headSha && actualHead !== expectation.headSha) {
    errors.push(`PROVENANCE_HEAD_SHA_MISMATCH: ${label} expected ${expectation.headSha}, got ${actualHead}`);
  }
  return errors;
}

function validateRepositoryHashes(label, catalog, expectation = {}) {
  const errors = [];
  const provenance = catalog && catalog._provenance;
  if (!provenance || typeof provenance !== "object") return errors;
  if (provenance.source_kind === "versioned_baseline_fixture") {
    const expectedMigrationHash = repositoryFileSha256(BASELINE_MIGRATION_PATH);
    const expectedGeneratorHash = repositoryFileSha256(FIXTURE_GENERATOR_PATH);
    if (provenance.baseline_migration_sha256 !== expectedMigrationHash) {
      errors.push(`PROVENANCE_BASELINE_HASH_MISMATCH: ${label}`);
    }
    if (provenance.generator_sha256 !== expectedGeneratorHash) {
      errors.push(`PROVENANCE_GENERATOR_HASH_MISMATCH: ${label}`);
    }
  }
  if (provenance.source_kind === "database_capture") {
    const expectedScripts = {
      capture_engine: repositoryFileSha256(CAPTURE_ENGINE_PATH),
    };
    if (expectation.captureProfile === "production") {
      expectedScripts["capture-production-catalog.cjs"] = repositoryFileSha256(
        PRODUCTION_CAPTURE_PATH
      );
      expectedScripts["safety-guard.cjs"] = repositoryFileSha256(SAFETY_GUARD_PATH);
      expectedScripts["supabase-tls.cjs"] = repositoryFileSha256(SUPABASE_TLS_PATH);
      expectedScripts["supabase-root-2021-ca.pem"] = repositoryFileSha256(
        SUPABASE_ROOT_CA_PATH
      );
      if (provenance.tls_mode !== "verify-full") {
        errors.push(`PROVENANCE_TLS_MODE_MISMATCH: ${label}`);
      }
      if (provenance.tls_ca_sha256 !== SUPABASE_ROOT_CA_SHA256) {
        errors.push(`PROVENANCE_TLS_CA_MISMATCH: ${label}`);
      }
    } else if (expectation.captureProfile !== "generic") {
      errors.push(`PROVENANCE_CAPTURE_PROFILE_MISSING: ${label}`);
    }
    const actualScripts = provenance.supporting_script_sha256 || {};
    const expectedKeys = Object.keys(expectedScripts).sort();
    const actualKeys = Object.keys(actualScripts).sort();
    if (!sameValue(expectedKeys, actualKeys)) {
      errors.push(`PROVENANCE_SUPPORTING_SCRIPT_SET_MISMATCH: ${label}`);
    }
    for (const [script, expectedHash] of Object.entries(expectedScripts)) {
      if (actualScripts[script] !== expectedHash) {
        errors.push(`PROVENANCE_SCRIPT_HASH_MISMATCH: ${label}.${script}`);
      }
    }
  }
  return errors;
}

function compareCatalogs(production, rehearsal, expectations = {}) {
  const diffs = [
    ...validateCatalog("production", production),
    ...validateCatalog("rehearsal", rehearsal),
    ...validateRepositoryHashes("production", production, expectations.production),
    ...validateRepositoryHashes("rehearsal", rehearsal, expectations.rehearsal),
    ...validateCatalogExpectation("production", production, expectations.production),
    ...validateCatalogExpectation("rehearsal", rehearsal, expectations.rehearsal),
  ];
  if (diffs.length > 0) return diffs;

  for (const table of APPROVED_TABLES) {
    const productionTable = production[table];
    const rehearsalTable = rehearsal[table];

    if (productionTable.columns.length !== rehearsalTable.columns.length) {
      diffs.push(
        `COLUMN_COUNT_DIFF: ${table} production=${productionTable.columns.length} rehearsal=${rehearsalTable.columns.length}`
      );
    }
    const productionColumns = new Map(
      productionTable.columns.map((column) => [column.column_name, column])
    );
    const rehearsalColumns = new Map(
      rehearsalTable.columns.map((column) => [column.column_name, column])
    );
    const columnNames = new Set([...productionColumns.keys(), ...rehearsalColumns.keys()]);
    for (const columnName of [...columnNames].sort()) {
      if (!productionColumns.has(columnName)) {
        diffs.push(`COLUMN_MISSING_IN_PRODUCTION: ${table}.${columnName}`);
        continue;
      }
      if (!rehearsalColumns.has(columnName)) {
        diffs.push(`COLUMN_MISSING_IN_REHEARSAL: ${table}.${columnName}`);
        continue;
      }
      const productionColumn = productionColumns.get(columnName);
      const rehearsalColumn = rehearsalColumns.get(columnName);
      for (const field of COLUMN_FIELDS) {
        if (!sameValue(productionColumn[field], rehearsalColumn[field])) {
          diffs.push(`COLUMN_${field.toUpperCase()}_DIFF: ${table}.${columnName}`);
        }
      }
    }

    compareNamedItems(
      "CONSTRAINT",
      table,
      productionTable.constraints,
      rehearsalTable.constraints,
      ["type", "definition"],
      diffs
    );
    compareNamedItems(
      "INDEX",
      table,
      productionTable.indexes,
      rehearsalTable.indexes,
      ["definition"],
      diffs
    );
  }
  return diffs;
}

function readCatalog(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to parse ${filePath}: ${error.message}`);
  }
}

function writeReport(reportPath, diffs) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const tempPath = `${reportPath}.tmp`;
  fs.writeFileSync(tempPath, `${diffs.length === 0 ? "NO_DIFFS" : diffs.join("\n")}\n`);
  fs.renameSync(tempPath, reportPath);
}

function cli() {
  const productionPath = process.env.PROD_CATALOG || "backups/production-full-catalog.json";
  const rehearsalPath = process.env.REH_CATALOG || "backups/rehearsal-full-catalog.json";
  const reportPath = process.env.CATALOG_REPORT || "backups/catalog-comparison.txt";

  if (!fs.existsSync(productionPath) || !fs.existsSync(rehearsalPath)) {
    throw new Error(`Catalog files not found: ${productionPath}, ${rehearsalPath}`);
  }
  const productionSourceKind = process.env.PROD_EXPECTED_SOURCE_KIND;
  const rehearsalSourceKind = process.env.REH_EXPECTED_SOURCE_KIND;
  if (!productionSourceKind || !rehearsalSourceKind) {
    throw new Error("PROD_EXPECTED_SOURCE_KIND and REH_EXPECTED_SOURCE_KIND are required");
  }
  function expectationFor(prefix, sourceKind) {
    const expectation = {
      sourceKind,
      projectRef: process.env[`${prefix}_EXPECTED_PROJECT_REF`] || undefined,
      headSha: process.env[`${prefix}_EXPECTED_HEAD_SHA`] || undefined,
      captureProfile: process.env[`${prefix}_EXPECTED_CAPTURE_PROFILE`] || undefined,
    };
    if (
      sourceKind === "database_capture" &&
      (!expectation.projectRef || !expectation.headSha || !expectation.captureProfile)
    ) {
      throw new Error(
        `${prefix}_EXPECTED_PROJECT_REF, ${prefix}_EXPECTED_HEAD_SHA, and ${prefix}_EXPECTED_CAPTURE_PROFILE are required for database captures`
      );
    }
    return expectation;
  }
  const diffs = compareCatalogs(readCatalog(productionPath), readCatalog(rehearsalPath), {
    production: expectationFor("PROD", productionSourceKind),
    rehearsal: expectationFor("REH", rehearsalSourceKind),
  });
  writeReport(reportPath, diffs);
  if (diffs.length > 0) {
    console.error(diffs.join("\n"));
    console.error(`Catalog comparison failed with ${diffs.length} difference(s)`);
    process.exitCode = 1;
    return;
  }
  console.log("NO_DIFFS");
}

if (require.main === module) {
  try {
    cli();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  compareCatalogs,
  readCatalog,
  validateCatalogExpectation,
  validateRepositoryHashes,
  writeReport,
};
