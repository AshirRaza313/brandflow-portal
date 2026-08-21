"use strict";

// One-time, deterministic normalizer for the legacy baseline fixture. It fills
// PostgreSQL metadata that was omitted by the original capture. CI still
// compares this committed fixture against a live PostgreSQL 16 capture.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  canonicalJson,
  sha256,
  structuralSha256,
} = require("./catalog-contract.cjs");

const fixturePath = path.resolve(
  process.env.BASELINE_FIXTURE || "tests/fixtures/expected-baseline-catalog.json"
);
const migrationPath = path.resolve(
  "prisma/migrations/20260101000000_baseline/migration.sql"
);

function formattedType(column) {
  if (column.data_type === "text") return "text";
  if (column.data_type === "timestamp without time zone") {
    return "timestamp(3) without time zone";
  }
  if (column.data_type === "integer") return "integer";
  if (column.data_type === "boolean") return "boolean";
  if (column.data_type === "jsonb") return "jsonb";
  if (column.data_type === "double precision") return "double precision";
  if (column.data_type === "numeric") {
    return `numeric(${column.numeric_precision},${column.numeric_scale})`;
  }
  throw new Error(`Unsupported legacy fixture data_type: ${column.data_type}`);
}

const catalog = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const previousProvenance = catalog._provenance;
delete catalog._provenance;

for (const [table, entry] of Object.entries(catalog)) {
  entry.columns = entry.columns.map((column, index) => ({
    column_name: column.column_name,
    ordinal_position: index + 1,
    data_type: column.data_type,
    formatted_type: formattedType(column),
    is_nullable: column.is_nullable,
    column_default: column.column_default ?? null,
    character_maximum_length: column.character_maximum_length ?? null,
    numeric_precision: column.numeric_precision ?? null,
    numeric_scale: column.numeric_scale ?? null,
    datetime_precision: column.data_type === "timestamp without time zone" ? 3 : null,
    udt_schema: "pg_catalog",
    udt_name: column.udt_name,
    domain_schema: null,
    domain_name: null,
    is_identity: column.is_identity,
    identity_generation: null,
    is_generated: column.is_generated,
    generation_expression: null,
    collation_name: column.collation_name ?? null,
  }));
  if (!entry.columns.length) throw new Error(`Fixture table ${table} has no columns`);
}

const generatedAtUtc =
  process.env.FIXTURE_GENERATED_AT_UTC || previousProvenance?.generated_at_utc;
const sourceFixtureCommitSha =
  process.env.FIXTURE_SOURCE_COMMIT_SHA ||
  previousProvenance?.source_fixture_commit_sha;
if (!generatedAtUtc || Number.isNaN(new Date(generatedAtUtc).valueOf())) {
  throw new Error("FIXTURE_GENERATED_AT_UTC is required for first-time fixture generation");
}
if (!/^[0-9a-f]{40}$/.test(sourceFixtureCommitSha || "")) {
  throw new Error("FIXTURE_SOURCE_COMMIT_SHA must identify the exact legacy fixture commit");
}
const sourceFixtureBlobSha1 =
  process.env.FIXTURE_SOURCE_BLOB_SHA1 ||
  previousProvenance?.source_fixture_blob_sha1 ||
  execFileSync(
    "git",
    ["rev-parse", `${sourceFixtureCommitSha}:tests/fixtures/expected-baseline-catalog.json`],
    { encoding: "utf8" }
  ).trim();
if (!/^[0-9a-f]{40}$/.test(sourceFixtureBlobSha1)) {
  throw new Error("Unable to verify the legacy fixture Git blob SHA");
}
catalog._provenance = {
  source_kind: "versioned_baseline_fixture",
  generated_at_utc: new Date(generatedAtUtc).toISOString(),
  source_fixture_commit_sha: sourceFixtureCommitSha,
  source_fixture_blob_sha1: sourceFixtureBlobSha1,
  baseline_migration_sha256: sha256(fs.readFileSync(migrationPath)),
  generator_sha256: sha256(fs.readFileSync(__filename)),
  catalog_sha256: structuralSha256(catalog),
};

fs.writeFileSync(fixturePath, `${canonicalJson(catalog)}\n`);
console.log(`Normalized baseline fixture: ${fixturePath}`);
