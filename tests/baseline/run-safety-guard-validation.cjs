"use strict";

const path = require("path");
const { spawnSync } = require("child_process");

const guardPath = path.resolve("scripts/baseline/safety-guard.cjs");
let passed = 0;
let failed = 0;

function run(functionName, envVar, value, environment = {}) {
  const code = `require(${JSON.stringify(guardPath)})[${JSON.stringify(functionName)}](${JSON.stringify(envVar)})`;
  return spawnSync(process.execPath, ["-e", code], {
    encoding: "utf8",
    env: { ...process.env, ...environment, [envVar]: value },
  });
}

function runIdentity(parsed, row) {
  const code = `
    const guard = require(${JSON.stringify(guardPath)});
    const queryable = { query: async () => ({ rows: [${JSON.stringify(row)}] }) };
    guard.assertConnectedIdentity(queryable, ${JSON.stringify(parsed)})
      .then(() => process.exit(0))
      .catch((error) => { console.error(error.message); process.exit(1); });
  `;
  return spawnSync(process.execPath, ["-e", code], { encoding: "utf8", env: process.env });
}

function test(name, expectedSuccess, result) {
  const succeeded = result.status === 0;
  if (succeeded === expectedSuccess) {
    console.log(`PASS: ${name}`);
    passed += 1;
  } else {
    console.error(`FAIL: ${name}: status=${result.status} ${result.stderr}`);
    failed += 1;
  }
}

const ciUrl = "postgresql://valtriox_test:test@localhost:5432/valtriox_test";
test("exact GitHub CI localhost accepted", true, run("validateRehearsalUrl", "TEST_URL", ciUrl, {
  CI: "true",
  GITHUB_ACTIONS: "true",
}));
test("localhost outside GitHub Actions rejected", false, run("validateRehearsalUrl", "TEST_URL", ciUrl, {
  CI: "false",
  GITHUB_ACTIONS: "false",
}));
test("wrong CI database rejected", false, run(
  "validateRehearsalUrl",
  "TEST_URL",
  "postgresql://valtriox_test:test@localhost:5432/postgres",
  { CI: "true", GITHUB_ACTIONS: "true" }
));

const stagingRef = "igyqgchgfmcfvjmakvyk";
const stagingHost = `db.${stagingRef}.supabase.co`;
const stagingEnv = {
  CI: "false",
  GITHUB_ACTIONS: "false",
  ALLOWED_STAGING_REFS: stagingRef,
  REHEARSAL_EXPECTED_HOST: stagingHost,
  REHEARSAL_EXPECTED_DB_USER: "audit_user",
};
test("exact allowlisted staging accepted", true, run(
  "validateRehearsalUrl",
  "TEST_URL",
  `postgresql://audit_user:test@${stagingHost}:5432/postgres`,
  stagingEnv
));
test("staging URL fragment rejected", false, run(
  "validateRehearsalUrl",
  "TEST_URL",
  `postgresql://audit_user:test@${stagingHost}:5432/postgres#fragment`,
  stagingEnv
));
const poolerHost = "aws-0-ap-southeast-1.pooler.supabase.com";
const poolerUser = `postgres.${stagingRef}`;
const poolerEnv = {
  ...stagingEnv,
  REHEARSAL_EXPECTED_HOST: poolerHost,
  REHEARSAL_EXPECTED_DB_USER: poolerUser,
  REHEARSAL_EXPECTED_DB_ROLE: "postgres",
};
test("exact allowlisted session pooler accepted", true, run(
  "validateRehearsalUrl",
  "TEST_URL",
  `postgresql://${poolerUser}:test@${poolerHost}:5432/postgres`,
  poolerEnv
));
test("non-allowlisted staging rejected", false, run(
  "validateRehearsalUrl",
  "TEST_URL",
  `postgresql://audit_user:test@${stagingHost}:5432/postgres`,
  { ...stagingEnv, ALLOWED_STAGING_REFS: "aaaaaaaaaaaaaaaaaaaa" }
));
test("production rejected as rehearsal", false, run(
  "validateRehearsalUrl",
  "TEST_URL",
  "postgresql://postgres:test@db.wqwsagnxkamblnefhpzx.supabase.co:5432/postgres",
  stagingEnv
));

const productionHost = "db.wqwsagnxkamblnefhpzx.supabase.co";
const productionEnv = {
  PRODUCTION_EXPECTED_HOST: productionHost,
  PRODUCTION_EXPECTED_DB_USER: "audit_user",
  PRODUCTION_EXPECTED_DB_NAME: "postgres",
};
test("exact production evidence target accepted", true, run(
  "validateProductionUrl",
  "TEST_URL",
  `postgresql://audit_user:test@${productionHost}:5432/postgres`,
  productionEnv
));
test("production URL fragment rejected", false, run(
  "validateProductionUrl",
  "TEST_URL",
  `postgresql://audit_user:test@${productionHost}:5432/postgres#fragment`,
  productionEnv
));
test("production user mismatch rejected", false, run(
  "validateProductionUrl",
  "TEST_URL",
  `postgresql://postgres:test@${productionHost}:5432/postgres`,
  productionEnv
));
test("transaction pooler port rejected", false, run(
  "validateProductionUrl",
  "TEST_URL",
  `postgresql://audit_user:test@${productionHost}:6543/postgres`,
  productionEnv
));

test("direct connected identity accepted", true, runIdentity(
  {
    host: productionHost,
    port: 5432,
    dbname: "postgres",
    user: "audit_user",
    expectedConnectedRole: "audit_user",
    projectRef: "wqwsagnxkamblnefhpzx",
  },
  {
    db_name: "postgres",
    db_user: "audit_user",
    session_user: "audit_user",
    server_address: "10.0.0.1",
    server_port: 5432,
  }
));
test("pooler client user maps to connected role", true, runIdentity(
  {
    host: poolerHost,
    port: 5432,
    dbname: "postgres",
    user: poolerUser,
    expectedConnectedRole: "postgres",
    projectRef: stagingRef,
  },
  {
    db_name: "postgres",
    db_user: "postgres",
    session_user: "postgres",
    server_address: "10.0.0.2",
    server_port: 5432,
  }
));
test("unexpected connected role rejected", false, runIdentity(
  {
    host: productionHost,
    port: 5432,
    dbname: "postgres",
    user: "audit_user",
    expectedConnectedRole: "audit_user",
    projectRef: "wqwsagnxkamblnefhpzx",
  },
  {
    db_name: "postgres",
    db_user: "postgres",
    session_user: "postgres",
    server_address: "10.0.0.1",
    server_port: 5432,
  }
));

console.log(`\nSafety guard results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
