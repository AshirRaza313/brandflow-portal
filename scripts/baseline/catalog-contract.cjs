"use strict";

const crypto = require("crypto");

const APPROVED_TABLES = Object.freeze([
  "Account",
  "Attendance",
  "Automation",
  "BetaInvite",
  "ClientMessage",
  "Coupon",
  "Customer",
  "EmailTemplate",
  "Expense",
  "Feedback",
  "IntegrationConnection",
  "Invoice",
  "Lead",
  "LegalPage",
  "Notification",
  "Order",
  "OrderItem",
  "Organization",
  "OrganizationMember",
  "PaymentProof",
  "PlatformDocument",
  "PlatformSettings",
  "Product",
  "Proposal",
  "PushSubscription",
  "ReportExport",
  "Role",
  "Session",
  "Subscription",
  "SubscriptionPlan",
  "SupportConversation",
  "SupportMessage",
  "SystemSetting",
  "TeamInvitation",
  "TeamTask",
  "User",
  "ValtrioxTeamInvitation",
  "ValtrioxTeamMember",
  "VerificationToken",
  "suppliers",
]);

const COLUMN_FIELDS = Object.freeze([
  "column_name",
  "ordinal_position",
  "data_type",
  "formatted_type",
  "is_nullable",
  "column_default",
  "character_maximum_length",
  "numeric_precision",
  "numeric_scale",
  "datetime_precision",
  "udt_schema",
  "udt_name",
  "domain_schema",
  "domain_name",
  "is_identity",
  "identity_generation",
  "is_generated",
  "generation_expression",
  "collation_name",
]);

function structuralCatalog(catalog) {
  const result = {};
  for (const table of tableKeys(catalog)) {
    result[table] = catalog[table];
  }
  return result;
}

function canonicalJson(value) {
  return JSON.stringify(value, null, 2);
}

function sha256(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return crypto.createHash("sha256").update(input).digest("hex");
}

// Repository source files are text. Hash their canonical LF representation so
// provenance is identical on Windows (core.autocrlf) and Linux CI checkouts.
function repositoryFileSha256(filePath) {
  const canonicalText = require("fs")
    .readFileSync(filePath, "utf8")
    .replace(/\r\n?/g, "\n");
  return sha256(canonicalText);
}

function structuralSha256(catalog) {
  return sha256(canonicalJson(structuralCatalog(catalog)));
}

function tableKeys(catalog) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    return [];
  }
  return Object.keys(catalog)
    .filter((key) => key !== "_provenance" && key !== "_prisma_migrations")
    .sort();
}

function isNullableInteger(value) {
  return value === null || Number.isInteger(value);
}

function isNullableString(value) {
  return value === null || typeof value === "string";
}

function pushTypeError(errors, path, expected) {
  errors.push(`MALFORMED_FIELD: ${path} must be ${expected}`);
}

function isHex(value, length) {
  return typeof value === "string" && new RegExp(`^[0-9a-f]{${length}}$`).test(value);
}

function isIsoTimestamp(value) {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

function validateProvenance(label, catalog, errors) {
  const provenance = catalog._provenance;
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) {
    errors.push(`MALFORMED_PROVENANCE: ${label}._provenance must be an object`);
    return;
  }

  if (provenance.source_kind === "versioned_baseline_fixture") {
    const requiredStrings = [
      "generated_at_utc",
      "source_fixture_commit_sha",
      "source_fixture_blob_sha1",
      "baseline_migration_sha256",
      "generator_sha256",
      "catalog_sha256",
    ];
    for (const field of requiredStrings) {
      if (typeof provenance[field] !== "string" || provenance[field].length === 0) {
        pushTypeError(errors, `${label}._provenance.${field}`, "a non-empty string");
      }
    }
    if (!isIsoTimestamp(provenance.generated_at_utc)) {
      errors.push(`MALFORMED_PROVENANCE: ${label}.generated_at_utc must be an ISO timestamp`);
    }
    if (!isHex(provenance.source_fixture_commit_sha, 40)) {
      errors.push(`MALFORMED_PROVENANCE: ${label}.source_fixture_commit_sha must be a 40-character Git SHA`);
    }
    if (!isHex(provenance.source_fixture_blob_sha1, 40)) {
      errors.push(`MALFORMED_PROVENANCE: ${label}.source_fixture_blob_sha1 must be a 40-character Git blob SHA`);
    }
    for (const field of ["baseline_migration_sha256", "generator_sha256", "catalog_sha256"]) {
      if (!isHex(provenance[field], 64)) {
        errors.push(`MALFORMED_PROVENANCE: ${label}.${field} must be SHA-256`);
      }
    }
  } else if (provenance.source_kind === "database_capture") {
    const requiredStrings = [
      "project_ref",
      "db_name",
      "db_user",
      "session_user",
      "client_user",
      "source_host",
      "server_address",
      "captured_at_utc",
      "pg_version",
      "head_sha",
      "run_id",
      "run_attempt",
      "capture_engine_sha256",
      "catalog_sha256",
      "transaction_mode",
      "snapshot_id",
    ];
    for (const field of requiredStrings) {
      if (typeof provenance[field] !== "string" || provenance[field].length === 0) {
        pushTypeError(errors, `${label}._provenance.${field}`, "a non-empty string");
      }
    }
    if (!Number.isInteger(provenance.source_port)) {
      pushTypeError(errors, `${label}._provenance.source_port`, "an integer");
    }
    if (provenance.transaction_read_only !== "on") {
      errors.push(`MALFORMED_PROVENANCE: ${label} capture was not read-only`);
    }
    if (provenance.transaction_isolation !== "repeatable read") {
      errors.push(`MALFORMED_PROVENANCE: ${label} capture was not repeatable-read`);
    }
    if (provenance.transaction_mode !== "repeatable_read_read_only") {
      errors.push(`MALFORMED_PROVENANCE: ${label} transaction_mode is invalid`);
    }
    const localCapture = ["localhost", "127.0.0.1", "::1"].includes(
      provenance.source_host
    );
    if (localCapture) {
      if (provenance.tls_mode !== "disabled_localhost") {
        errors.push(`MALFORMED_PROVENANCE: ${label}.tls_mode must be disabled_localhost`);
      }
      if (provenance.tls_servername !== null || provenance.tls_ca_sha256 !== null) {
        errors.push(`MALFORMED_PROVENANCE: ${label} localhost TLS evidence is invalid`);
      }
    } else {
      if (provenance.tls_mode !== "verify-full") {
        errors.push(`MALFORMED_PROVENANCE: ${label}.tls_mode must be verify-full`);
      }
      if (provenance.tls_servername !== provenance.source_host) {
        errors.push(`MALFORMED_PROVENANCE: ${label}.tls_servername mismatch`);
      }
      if (!isHex(provenance.tls_ca_sha256, 64)) {
        errors.push(`MALFORMED_PROVENANCE: ${label}.tls_ca_sha256 must be SHA-256`);
      }
    }
    if (!isIsoTimestamp(provenance.captured_at_utc)) {
      errors.push(`MALFORMED_PROVENANCE: ${label}.captured_at_utc must be an ISO timestamp`);
    }
    if (!isHex(provenance.head_sha, 40)) {
      errors.push(`MALFORMED_PROVENANCE: ${label}.head_sha must be a 40-character Git SHA`);
    }
    if (provenance.merge_sha !== null && provenance.merge_sha !== undefined && !isHex(provenance.merge_sha, 40)) {
      errors.push(`MALFORMED_PROVENANCE: ${label}.merge_sha must be null or a 40-character Git SHA`);
    }
    if (!isHex(provenance.capture_engine_sha256, 64)) {
      errors.push(`MALFORMED_PROVENANCE: ${label}.capture_engine_sha256 must be SHA-256`);
    }
    if (!isHex(provenance.catalog_sha256, 64)) {
      errors.push(`MALFORMED_PROVENANCE: ${label}.catalog_sha256 must be SHA-256`);
    }
    if (
      !provenance.supporting_script_sha256 ||
      typeof provenance.supporting_script_sha256 !== "object" ||
      Array.isArray(provenance.supporting_script_sha256)
    ) {
      errors.push(`MALFORMED_PROVENANCE: ${label}.supporting_script_sha256 must be an object`);
    } else {
      for (const [script, hash] of Object.entries(provenance.supporting_script_sha256)) {
        if (!script || !isHex(hash, 64)) {
          errors.push(`MALFORMED_PROVENANCE: ${label}.supporting_script_sha256 is invalid`);
        }
      }
      if (provenance.supporting_script_sha256.capture_engine !== provenance.capture_engine_sha256) {
        errors.push(`MALFORMED_PROVENANCE: ${label} capture-engine hashes disagree`);
      }
    }
    const connected = provenance.connected_identity;
    if (!connected || typeof connected !== "object" || Array.isArray(connected)) {
      errors.push(`MALFORMED_PROVENANCE: ${label}.connected_identity must be an object`);
    } else {
      const matchingFields = [
        ["db_name", "db_name"],
        ["db_user", "db_user"],
        ["session_user", "session_user"],
        ["client_user", "client_user"],
        ["server_address", "server_address"],
        ["server_port", "source_port"],
        ["validated_host", "source_host"],
        ["project_ref", "project_ref"],
      ];
      for (const [connectedField, provenanceField] of matchingFields) {
        if (connected[connectedField] !== provenance[provenanceField]) {
          errors.push(`MALFORMED_PROVENANCE: ${label}.connected_identity.${connectedField} mismatch`);
        }
      }
      if (connected.expected_connected_role !== provenance.db_user) {
        errors.push(`MALFORMED_PROVENANCE: ${label}.connected_identity expected role mismatch`);
      }
    }
  } else {
    errors.push(`MALFORMED_PROVENANCE: ${label} has unsupported source_kind`);
  }

  if (
    typeof provenance.catalog_sha256 === "string" &&
    provenance.catalog_sha256 !== structuralSha256(catalog)
  ) {
    errors.push(`CATALOG_HASH_MISMATCH: ${label} structural SHA-256 is invalid`);
  }
}

function validateColumn(label, table, column, errors) {
  const path = `${label}.${table}.${column && column.column_name ? column.column_name : "?"}`;
  if (!column || typeof column !== "object" || Array.isArray(column)) {
    errors.push(`MALFORMED_COLUMN: ${path} must be an object`);
    return;
  }

  for (const field of COLUMN_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(column, field)) {
      errors.push(`MISSING_REQUIRED_FIELD: ${path}.${field}`);
    }
  }

  if (typeof column.column_name !== "string" || column.column_name.length === 0) {
    pushTypeError(errors, `${path}.column_name`, "a non-empty string");
  }
  if (!Number.isInteger(column.ordinal_position) || column.ordinal_position < 1) {
    pushTypeError(errors, `${path}.ordinal_position`, "a positive integer");
  }
  for (const field of ["data_type", "formatted_type", "udt_schema", "udt_name"] ) {
    if (typeof column[field] !== "string" || column[field].length === 0) {
      pushTypeError(errors, `${path}.${field}`, "a non-empty string");
    }
  }
  if (column.is_nullable !== "YES" && column.is_nullable !== "NO") {
    pushTypeError(errors, `${path}.is_nullable`, '"YES" or "NO"');
  }
  for (const field of ["column_default", "domain_schema", "domain_name", "identity_generation", "generation_expression", "collation_name"]) {
    if (!isNullableString(column[field])) {
      pushTypeError(errors, `${path}.${field}`, "a string or null");
    }
  }
  for (const field of ["character_maximum_length", "numeric_precision", "numeric_scale", "datetime_precision"]) {
    if (!isNullableInteger(column[field])) {
      pushTypeError(errors, `${path}.${field}`, "an integer or null");
    }
  }
  if (typeof column.is_identity !== "string" || typeof column.is_generated !== "string") {
    pushTypeError(errors, path, "string identity/generated flags");
  }
}

function validateCatalog(label, catalog) {
  const errors = [];
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    return [`MALFORMED_CATALOG: ${label} must be an object`];
  }

  validateProvenance(label, catalog, errors);
  const keys = tableKeys(catalog);
  const approved = new Set(APPROVED_TABLES);
  if (keys.length !== APPROVED_TABLES.length) {
    errors.push(`EXACT_TABLE_COUNT: ${label} has ${keys.length} tables; expected ${APPROVED_TABLES.length}`);
  }
  for (const table of APPROVED_TABLES) {
    if (!keys.includes(table)) {
      errors.push(`MISSING_APPROVED_TABLE: ${label}.${table}`);
    }
  }
  for (const table of keys) {
    if (!approved.has(table)) {
      errors.push(`UNAPPROVED_TABLE: ${label}.${table}`);
    }
    const entry = catalog[table];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`MALFORMED_TABLE: ${label}.${table} must be an object`);
      continue;
    }
    for (const field of ["columns", "constraints", "indexes"]) {
      if (!Array.isArray(entry[field])) {
        errors.push(`MALFORMED_TABLE: ${label}.${table}.${field} must be an array`);
      }
    }
    if (!Array.isArray(entry.columns) || !Array.isArray(entry.constraints) || !Array.isArray(entry.indexes)) {
      continue;
    }
    if (entry.columns.length === 0) {
      errors.push(`MALFORMED_TABLE: ${label}.${table}.columns cannot be empty`);
    }
    entry.columns.forEach((column) => validateColumn(label, table, column, errors));

    const columnNames = entry.columns.map((column) => column.column_name);
    const constraintNames = entry.constraints.map((constraint) => constraint && constraint.name);
    const indexNames = entry.indexes.map((index) => index && index.name);
    for (const [kind, names] of [["COLUMNS", columnNames], ["CONSTRAINTS", constraintNames], ["INDEXES", indexNames]]) {
      if (new Set(names).size !== names.length) {
        errors.push(`DUPLICATE_${kind}: ${label}.${table}`);
      }
    }

    for (const constraint of entry.constraints) {
      if (!constraint || typeof constraint !== "object" || Array.isArray(constraint)) {
        errors.push(`MALFORMED_CONSTRAINT: ${label}.${table}`);
        continue;
      }
      for (const field of ["name", "type", "definition"]) {
        if (typeof constraint[field] !== "string" || constraint[field].length === 0) {
          pushTypeError(errors, `${label}.${table}.constraint.${field}`, "a non-empty string");
        }
      }
    }
    for (const index of entry.indexes) {
      if (!index || typeof index !== "object" || Array.isArray(index)) {
        errors.push(`MALFORMED_INDEX: ${label}.${table}`);
        continue;
      }
      for (const field of ["name", "definition"]) {
        if (typeof index[field] !== "string" || index[field].length === 0) {
          pushTypeError(errors, `${label}.${table}.index.${field}`, "a non-empty string");
        }
      }
    }
  }
  return errors;
}

module.exports = {
  APPROVED_TABLES,
  COLUMN_FIELDS,
  canonicalJson,
  repositoryFileSha256,
  sha256,
  structuralCatalog,
  structuralSha256,
  tableKeys,
  validateCatalog,
};
