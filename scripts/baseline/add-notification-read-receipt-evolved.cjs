"use strict";

const fs = require("fs");
const path = require("path");
const { canonicalJson, structuralSha256 } = require("./catalog-contract.cjs");

const fixturePath = path.resolve("tests/fixtures/expected-evolved-catalog.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

function column(name, ordinal, type, nullable, defaultVal) {
  return {
    column_name: name,
    ordinal_position: ordinal,
    data_type: type,
    formatted_type: type === "timestamp without time zone" ? "timestamp(3) without time zone" : type,
    is_nullable: nullable,
    column_default: defaultVal,
    character_maximum_length: null,
    numeric_precision: null,
    numeric_scale: null,
    datetime_precision: type === "timestamp without time zone" ? 3 : null,
    udt_schema: "pg_catalog",
    udt_name: type === "timestamp without time zone" ? "timestamp" : type,
    domain_schema: null,
    domain_name: null,
    is_identity: "NO",
    identity_generation: null,
    is_generated: "NEVER",
    generation_expression: null,
    collation_name: null,
  };
}

function pkeyIndex(tableName) {
  return { name: `${tableName}_pkey`, definition: `CREATE UNIQUE INDEX "${tableName}_pkey" ON public."${tableName}" USING btree (id)` };
}
function uniqueIndex(tableName, cols) {
  const colsStr = cols.join(", ");
  return { name: `${tableName}_${cols.join("_")}_key`, definition: `CREATE UNIQUE INDEX "${tableName}_${cols.join("_")}_key" ON public."${tableName}" USING btree (${colsStr})` };
}
function nonUniqueIndex(tableName, cols) {
  const colsStr = cols.join(", ");
  return { name: `${tableName}_${cols.join("_")}_idx`, definition: `CREATE INDEX "${tableName}_${cols.join("_")}_idx" ON public."${tableName}" USING btree (${colsStr})` };
}

const table = "NotificationReadReceipt";
fixture[table] = {
  columns: [
    column("id", 1, "text", "NO", null),
    column("notificationId", 2, "text", "NO", null),
    column("userId", 3, "text", "NO", null),
    column("readAt", 4, "timestamp without time zone", "NO", "CURRENT_TIMESTAMP"),
  ],
  constraints: [
    { name: `${table}_notificationId_fkey`, type: "f", definition: `FOREIGN KEY ("notificationId") REFERENCES "Notification"(id) ON UPDATE CASCADE ON DELETE CASCADE` },
    { name: `${table}_pkey`, type: "p", definition: "PRIMARY KEY (id)" },
    { name: `${table}_userId_fkey`, type: "f", definition: `FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE` },
  ],
  indexes: [
    pkeyIndex(table),
    uniqueIndex(table, ["notificationId", "userId"]),
    nonUniqueIndex(table, ["userId", "notificationId"]),
  ],
};

const prev = fixture._provenance;
delete fixture._provenance;
fixture._provenance = {
  ...prev,
  generated_at_utc: new Date().toISOString(),
  source_fixture_commit_sha: "f1e6e5e" + "0".repeat(34), // placeholder, replaced below with actual full SHA if needed
  source_fixture_blob_sha1: prev.source_fixture_blob_sha1,
  catalog_sha256: structuralSha256(fixture),
};

const fullSha = require("child_process").execSync("git rev-parse HEAD").toString().trim();
fixture._provenance.source_fixture_commit_sha = fullSha;
delete fixture._provenance;
fixture._provenance = {
  ...prev,
  generated_at_utc: new Date().toISOString(),
  source_fixture_commit_sha: fullSha,
  source_fixture_blob_sha1: prev.source_fixture_blob_sha1,
  catalog_sha256: structuralSha256(fixture),
};

fs.writeFileSync(fixturePath, `${canonicalJson(fixture)}\n`);
console.log(`Evolved fixture updated, table count: ${Object.keys(fixture).filter(k => !k.startsWith("_")).length}`);
