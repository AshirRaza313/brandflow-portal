"use strict";

const fs = require("fs");
const path = require("path");
const {
  structuralSha256,
} = require("../../scripts/baseline/catalog-contract.cjs");
const {
  compareCatalogs,
} = require("../../scripts/baseline/compare-catalogs.cjs");

const fixturePath = path.resolve("tests/fixtures/expected-baseline-catalog.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
let passed = 0;
let failed = 0;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rehash(catalog) {
  if (catalog._provenance) {
    catalog._provenance.catalog_sha256 = structuralSha256(catalog);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`FAIL: ${name}: ${error.message}`);
    failed += 1;
  }
}

function expectDiff(name, mutate, expectedCode, options = {}) {
  test(name, () => {
    const rehearsal = clone(fixture);
    mutate(rehearsal);
    if (options.rehash !== false) rehash(rehearsal);
    const diffs = compareCatalogs(fixture, rehearsal);
    assert(
      diffs.some((diff) => diff.includes(expectedCode)),
      `expected ${expectedCode}; got ${diffs.slice(0, 5).join(" | ")}`
    );
  });
}

test("complete canonical fixture returns NO_DIFFS", () => {
  const diffs = compareCatalogs(fixture, clone(fixture));
  assert(diffs.length === 0, diffs.join(" | "));
});

expectDiff("malformed second table fails", (catalog) => {
  catalog.Attendance = {};
}, "MALFORMED_TABLE");

expectDiff("duplicate columns fail", (catalog) => {
  catalog.Account.columns.push(clone(catalog.Account.columns[0]));
}, "DUPLICATE_COLUMNS");

expectDiff("duplicate constraints fail", (catalog) => {
  const table = Object.keys(catalog).find((key) => !key.startsWith("_") && catalog[key].constraints.length > 0);
  catalog[table].constraints.push(clone(catalog[table].constraints[0]));
}, "DUPLICATE_CONSTRAINTS");

expectDiff("duplicate indexes fail", (catalog) => {
  const table = Object.keys(catalog).find((key) => !key.startsWith("_") && catalog[key].indexes.length > 0);
  catalog[table].indexes.push(clone(catalog[table].indexes[0]));
}, "DUPLICATE_INDEXES");

expectDiff("39-table catalog fails", (catalog) => {
  delete catalog.Account;
}, "EXACT_TABLE_COUNT");

expectDiff("unapproved 41st table fails", (catalog) => {
  catalog._hidden_table = clone(catalog.Account);
}, "UNAPPROVED_TABLE");

expectDiff("missing formatted_type fails", (catalog) => {
  delete catalog.Account.columns[0].formatted_type;
}, "MISSING_REQUIRED_FIELD");

expectDiff("missing ordinal_position fails", (catalog) => {
  delete catalog.Account.columns[0].ordinal_position;
}, "MISSING_REQUIRED_FIELD");

expectDiff("missing datetime_precision fails", (catalog) => {
  delete catalog.Account.columns[0].datetime_precision;
}, "MISSING_REQUIRED_FIELD");

expectDiff("one-sided formatted type difference fails", (catalog) => {
  catalog.Account.columns[0].formatted_type = "integer";
}, "COLUMN_FORMATTED_TYPE_DIFF");

expectDiff("one-sided index difference fails", (catalog) => {
  const table = Object.keys(catalog).find((key) => !key.startsWith("_") && catalog[key].indexes.length > 0);
  catalog[table].indexes.pop();
}, "INDEX_MISSING_IN_REHEARSAL");

expectDiff("catalog hash mismatch fails", (catalog) => {
  catalog.Account.columns[0].data_type = "integer";
}, "CATALOG_HASH_MISMATCH", { rehash: false });

expectDiff("missing provenance fails", (catalog) => {
  delete catalog._provenance;
}, "MALFORMED_PROVENANCE", { rehash: false });

expectDiff("bad metadata type fails", (catalog) => {
  catalog.Account.columns[0].numeric_precision = "32";
}, "MALFORMED_FIELD");

expectDiff("invalid provenance SHA fails", (catalog) => {
  catalog._provenance.source_fixture_commit_sha = "not-a-sha";
}, "MALFORMED_PROVENANCE");

test("expected source kind is enforced", () => {
  const diffs = compareCatalogs(fixture, clone(fixture), {
    production: { sourceKind: "database_capture" },
  });
  assert(diffs.some((diff) => diff.includes("PROVENANCE_SOURCE_KIND_MISMATCH")), diffs.join(" | "));
});

test("expected source head is enforced", () => {
  const diffs = compareCatalogs(fixture, clone(fixture), {
    production: { headSha: "0000000000000000000000000000000000000000" },
  });
  assert(diffs.some((diff) => diff.includes("PROVENANCE_HEAD_SHA_MISMATCH")), diffs.join(" | "));
});

console.log(`\nCatalog validation results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
