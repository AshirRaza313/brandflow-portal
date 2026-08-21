"use strict";

const path = require("path");
const { captureFullCatalog } = require("./capture-full-catalog.cjs");
const { validateProductionUrl, PRODUCTION_REF } = require("./safety-guard.cjs");

async function main() {
  if (!/^[0-9a-f]{40}$/.test(process.env.EVIDENCE_HEAD_SHA || "")) {
    throw new Error("EVIDENCE_HEAD_SHA must be the exact 40-character reviewed commit SHA");
  }
  const parsed = validateProductionUrl("PRODUCTION_DATABASE_URL");
  const outputPath = process.env.PRODUCTION_CATALOG_OUTPUT || "backups/production-full-catalog.json";

  console.log("=== Read-only Production Catalog Capture ===");
  console.log(`Validated target: ${parsed.host}:${parsed.port}/${parsed.dbname}`);
  console.log(`Expected database user: ${parsed.user}`);

  await captureFullCatalog({
    connectionString: process.env.PRODUCTION_DATABASE_URL,
    outputPath,
    projectRef: PRODUCTION_REF,
    headSha: process.env.EVIDENCE_HEAD_SHA,
    expectedConnectedRole: parsed.expectedConnectedRole,
    extraScriptPaths: [
      __filename,
      path.resolve(__dirname, "safety-guard.cjs"),
    ],
  });
}

main().catch((error) => {
  console.error(`Production catalog capture failed: ${error.message}`);
  process.exit(1);
});
