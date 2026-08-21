"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SUPABASE_ROOT_CA_PATH = path.resolve(
  __dirname,
  "certs/supabase-root-2021-ca.pem"
);
const SUPABASE_ROOT_CA_SHA256 =
  "807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa";
const TLS_OVERRIDE_PARAMETERS = Object.freeze([
  "ssl",
  "sslaccept",
  "sslcert",
  "sslkey",
  "sslmode",
  "sslnegotiation",
  "sslrootcert",
]);

function certificateSha256(pem) {
  if (typeof pem !== "string" || pem.trim().length === 0) {
    throw new Error("Supabase root CA PEM is missing");
  }
  let certificate;
  try {
    certificate = new crypto.X509Certificate(pem);
  } catch (error) {
    throw new Error(`Supabase root CA PEM is invalid: ${error.message}`);
  }
  return crypto.createHash("sha256").update(certificate.raw).digest("hex");
}

function validateSupabaseRootCa(pem) {
  const fingerprint = certificateSha256(pem);
  if (fingerprint !== SUPABASE_ROOT_CA_SHA256) {
    throw new Error("Supabase root CA fingerprint mismatch");
  }
  return fingerprint;
}

function rejectTlsUrlOverrides(connectionString) {
  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch (error) {
    throw new Error(`Invalid PostgreSQL connection URL: ${error.message}`);
  }
  const overrides = [...new Set(parsed.searchParams.keys())].sort();
  if (overrides.length > 0 || connectionString.includes("?")) {
    const details = overrides.length > 0
      ? overrides.join(", ")
      : "empty query string";
    throw new Error(
      `PostgreSQL URL must not contain query parameters that override pinned TLS settings: ${details}`
    );
  }
  return parsed;
}

function strictSupabaseTls(connectionString, isLocal = false, caPem) {
  const parsed = rejectTlsUrlOverrides(connectionString);
  if (isLocal) return undefined;
  const ca = caPem === undefined
    ? fs.readFileSync(SUPABASE_ROOT_CA_PATH, "utf8")
    : caPem;
  validateSupabaseRootCa(ca);
  return {
    ca,
    rejectUnauthorized: true,
    servername: parsed.hostname,
  };
}

function strictPrismaConnectionUrl(connectionString, isLocal = false) {
  rejectTlsUrlOverrides(connectionString);
  if (isLocal) return connectionString;
  const ca = fs.readFileSync(SUPABASE_ROOT_CA_PATH, "utf8");
  validateSupabaseRootCa(ca);
  const parameters = new URLSearchParams({
    sslmode: "require",
    sslaccept: "strict",
    sslcert: SUPABASE_ROOT_CA_PATH,
  });
  return `${connectionString}?${parameters.toString()}`;
}

module.exports = {
  SUPABASE_ROOT_CA_PATH,
  SUPABASE_ROOT_CA_SHA256,
  TLS_OVERRIDE_PARAMETERS,
  certificateSha256,
  rejectTlsUrlOverrides,
  strictPrismaConnectionUrl,
  strictSupabaseTls,
  validateSupabaseRootCa,
};
