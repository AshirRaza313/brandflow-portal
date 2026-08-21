"use strict";

const TARGET_MIGRATION = "20260815_add_supplier_constraints_and_security";
const EXPECTED_CONSTRAINTS = Object.freeze([
  Object.freeze({
    name: "suppliers_rating_check",
    definition: "CHECK (rating IS NULL OR rating >= 1 AND rating <= 5)",
  }),
  Object.freeze({
    name: "suppliers_status_check",
    definition:
      "CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'blacklisted'::text]))",
  }),
]);
const EXPECTED_ROLES = Object.freeze(["anon", "authenticated", "service_role"]);
const TARGET_DENIED_GRANTEES = new Set(["PUBLIC", ...EXPECTED_ROLES]);

function fail(message) {
  throw new Error(message);
}

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    fail(`${label} must be a lowercase SHA-256 value`);
  }
}

function assertUnfinishedHistoryRow(row, expectedChecksum) {
  if (!row || typeof row !== "object") fail("Forward migration history row is missing");
  assertSha256(expectedChecksum, "Expected migration checksum");
  if (row.migration_name !== TARGET_MIGRATION) {
    fail("Forward migration history row has the wrong migration name");
  }
  if (row.checksum !== expectedChecksum) fail("Forward migration checksum mismatch");
  if (!row.started_at) fail("Forward migration history row has no started_at value");
  if (row.finished_at !== null || row.rolled_back_at !== null) {
    fail("Forward migration history row is not an unfinished, unresolved attempt");
  }
  if (Number(row.applied_steps_count) !== 0) {
    fail("Unfinished forward migration must have applied_steps_count=0");
  }
}

function normalizeConstraint(constraint) {
  return {
    name: constraint.name,
    definition: constraint.definition,
    type: constraint.type,
    validated: constraint.validated,
  };
}

function hasExactCommittedConstraints(constraints) {
  if (!Array.isArray(constraints) || constraints.length !== EXPECTED_CONSTRAINTS.length) {
    return false;
  }
  const actual = constraints
    .map(normalizeConstraint)
    .sort((a, b) => a.name.localeCompare(b.name));
  const expected = EXPECTED_CONSTRAINTS.map((constraint) => ({
    ...constraint,
    type: "c",
    validated: true,
  })).sort((a, b) => a.name.localeCompare(b.name));
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function hasExactDeniedPosture(state) {
  if (
    !state ||
    state.rls_enabled !== false ||
    state.rls_forced !== false ||
    Number(state.policy_count) !== 0 ||
    Number(state.public_table_grant_count) !== 0 ||
    Number(state.public_column_grant_count) !== 0 ||
    state.owner_acl_matches !== true ||
    !Array.isArray(state.roles) ||
    state.roles.length !== EXPECTED_ROLES.length
  ) {
    return false;
  }
  const roles = [...state.roles].sort((a, b) => a.role.localeCompare(b.role));
  return EXPECTED_ROLES.every((roleName, index) => {
    const role = roles[index];
    return (
      role &&
      role.role === roleName &&
      role.present === true &&
      Array.isArray(role.retained_table_privileges) &&
      role.retained_table_privileges.length === 0 &&
      Number(role.retained_column_privilege_count) === 0
    );
  });
}

function normalizedNonTargetAcl(entries) {
  if (!Array.isArray(entries)) return null;
  return entries
    .filter((entry) => !TARGET_DENIED_GRANTEES.has(entry.grantee))
    .map((entry) => ({ ...entry }))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function ownerAndNonTargetAclMatch(prestate, current) {
  if (!prestate || !current || prestate.table_owner !== current.table_owner) {
    return false;
  }
  const preTable = normalizedNonTargetAcl(prestate.table_acl);
  const currentTable = normalizedNonTargetAcl(current.table_acl);
  const preColumns = normalizedNonTargetAcl(prestate.column_acl);
  const currentColumns = normalizedNonTargetAcl(current.column_acl);
  if (!preTable || !currentTable || !preColumns || !currentColumns) return false;
  return (
    JSON.stringify(preTable) === JSON.stringify(currentTable) &&
    JSON.stringify(preColumns) === JSON.stringify(currentColumns)
  );
}

function classifyRecoveryState({
  historyRow,
  expectedChecksum,
  constraints,
  security,
  baselineCatalogMatches,
  forwardCatalogMatches,
  prestateMatches,
}) {
  assertUnfinishedHistoryRow(historyRow, expectedChecksum);

  const noSurvivingSql =
    Array.isArray(constraints) &&
    constraints.length === 0 &&
    baselineCatalogMatches === true &&
    prestateMatches === true;
  const exactCommittedSql =
    hasExactCommittedConstraints(constraints) &&
    hasExactDeniedPosture(security) &&
    forwardCatalogMatches === true;

  if (noSurvivingSql && !exactCommittedSql) {
    return Object.freeze({
      classification: "rolled_back_sql",
      allowedResolveFlag: "--rolled-back",
    });
  }
  if (exactCommittedSql && !noSurvivingSql) {
    return Object.freeze({
      classification: "committed_sql_unfinished_history",
      allowedResolveFlag: "--applied",
    });
  }
  fail("Supplier migration recovery state is partial, ambiguous, or unsupported");
}

function assertRequestedMode(classification, requestedFlag) {
  if (!classification || classification.allowedResolveFlag !== requestedFlag) {
    fail(
      `Requested ${requestedFlag} does not match classified recovery mode ${classification?.allowedResolveFlag || "none"}`,
    );
  }
}

module.exports = {
  EXPECTED_CONSTRAINTS,
  EXPECTED_ROLES,
  TARGET_MIGRATION,
  assertRequestedMode,
  assertUnfinishedHistoryRow,
  classifyRecoveryState,
  hasExactCommittedConstraints,
  hasExactDeniedPosture,
  ownerAndNonTargetAclMatch,
};
