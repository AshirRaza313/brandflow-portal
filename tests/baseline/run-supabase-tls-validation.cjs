"use strict";

const assert = require("assert/strict");
const tls = require("tls");
const { Client } = require("pg");
const {
  SUPABASE_ROOT_CA_SHA256,
  certificateSha256,
  rejectTlsUrlOverrides,
  strictSupabaseTls,
  validateSupabaseRootCa,
} = require("../../scripts/baseline/supabase-tls.cjs");

let passed = 0;

function check(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS: ${name}`);
}

const remoteUrl =
  "postgresql://reader.projectref@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";

check("reviewed Supabase root CA fingerprint is accepted", () => {
  const options = strictSupabaseTls(remoteUrl);
  assert.equal(certificateSha256(options.ca), SUPABASE_ROOT_CA_SHA256);
  assert.equal(options.rejectUnauthorized, true);
  assert.equal(options.servername, "aws-1-ap-south-1.pooler.supabase.com");
});

check("tampered CA is rejected", () => {
  const options = strictSupabaseTls(remoteUrl);
  const tampered = options.ca.replace("MIIDxD", "MIIDxE");
  assert.throws(() => validateSupabaseRootCa(tampered));
});

check("different valid CA is rejected", () => {
  const differentCa = tls.rootCertificates.find(
    (pem) => certificateSha256(pem) !== SUPABASE_ROOT_CA_SHA256
  );
  assert.ok(differentCa);
  assert.throws(() => validateSupabaseRootCa(differentCa), /fingerprint mismatch/);
});

check("missing CA is rejected", () => {
  assert.throws(() => validateSupabaseRootCa(""), /missing/);
});

for (const parameter of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert", "sslnegotiation"]) {
  check(`URL override ${parameter} is rejected`, () => {
    assert.throws(
      () => rejectTlsUrlOverrides(`${remoteUrl}?${parameter}=require`),
      /must not contain query parameters/
    );
  });
}

check("effective node-postgres config retains the pinned CA", () => {
  const client = new Client({
    connectionString: remoteUrl,
    ssl: strictSupabaseTls(remoteUrl),
  });
  assert.equal(client.connectionParameters.ssl.rejectUnauthorized, true);
  assert.equal(
    certificateSha256(client.connectionParameters.ssl.ca),
    SUPABASE_ROOT_CA_SHA256
  );
  assert.equal(
    client.connectionParameters.ssl.servername,
    "aws-1-ap-south-1.pooler.supabase.com"
  );
});

check("authority routing cannot be replaced by URL query parameters", () => {
  const smuggled = `${remoteUrl}?host=other.pooler.supabase.com&user=other&port=6543`;
  assert.throws(
    () => strictSupabaseTls(smuggled),
    /must not contain query parameters/
  );
});

check("even non-routing query parameters are rejected fail-closed", () => {
  assert.throws(
    () => strictSupabaseTls(`${remoteUrl}?application_name=evidence`),
    /must not contain query parameters/
  );
});

check("localhost capture keeps TLS disabled", () => {
  assert.equal(
    strictSupabaseTls(
      "postgresql://valtriox_test@localhost:5432/valtriox_test",
      true
    ),
    undefined
  );
});

check("localhost URL cannot smuggle an SSL override", () => {
  assert.throws(
    () => strictSupabaseTls(
      "postgresql://valtriox_test@localhost:5432/valtriox_test?sslmode=disable",
      true
    ),
    /must not contain query parameters/
  );
});

console.log(`${passed}/${passed} Supabase TLS validation checks passed`);
