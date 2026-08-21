"use strict";

const assert = require("assert/strict");
const {
  EXPECTED_CONSTRAINTS,
  EXPECTED_ROLES,
  TARGET_MIGRATION,
  assertRequestedMode,
  classifyRecoveryState,
  ownerAndNonTargetAclMatch,
} = require("../../scripts/baseline/classify-supplier-migration-recovery.cjs");

const CHECKSUM = "a".repeat(64);
let passed = 0;

function history(overrides = {}) {
  return {
    migration_name: TARGET_MIGRATION,
    checksum: CHECKSUM,
    started_at: "2026-08-21T00:00:00.000Z",
    finished_at: null,
    rolled_back_at: null,
    applied_steps_count: 0,
    ...overrides,
  };
}

function constraints() {
  return EXPECTED_CONSTRAINTS.map((constraint) => ({
    ...constraint,
    type: "c",
    validated: true,
  }));
}

function deniedSecurity(overrides = {}) {
  return {
    rls_enabled: false,
    rls_forced: false,
    policy_count: 0,
    public_table_grant_count: 0,
    public_column_grant_count: 0,
    owner_acl_matches: true,
    roles: EXPECTED_ROLES.map((role) => ({
      role,
      present: true,
      retained_table_privileges: [],
      retained_column_privilege_count: 0,
    })),
    ...overrides,
  };
}

function aclState(overrides = {}) {
  return {
    table_owner: "runtime_owner",
    table_acl: [
      {
        grantee: "runtime_owner",
        grantor: "runtime_owner",
        privilege_type: "SELECT",
        is_grantable: false,
      },
      {
        grantee: "anon",
        grantor: "runtime_owner",
        privilege_type: "SELECT",
        is_grantable: false,
      },
    ],
    column_acl: [
      {
        column_name: "name",
        grantee: "runtime_reader",
        grantor: "runtime_owner",
        privilege_type: "SELECT",
        is_grantable: false,
      },
    ],
    ...overrides,
  };
}

function rolledBackState(overrides = {}) {
  return {
    historyRow: history(),
    expectedChecksum: CHECKSUM,
    constraints: [],
    security: deniedSecurity(),
    baselineCatalogMatches: true,
    forwardCatalogMatches: false,
    prestateMatches: true,
    ...overrides,
  };
}

function committedState(overrides = {}) {
  return {
    historyRow: history(),
    expectedChecksum: CHECKSUM,
    constraints: constraints(),
    security: deniedSecurity(),
    baselineCatalogMatches: false,
    forwardCatalogMatches: true,
    prestateMatches: false,
    ...overrides,
  };
}

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    throw error;
  }
}

function expectFailure(name, input, pattern) {
  test(name, () => {
    assert.throws(() => classifyRecoveryState(input), pattern);
  });
}

test("classifies an exact no-survivor state as rolled back", () => {
  const result = classifyRecoveryState(rolledBackState());
  assert.equal(result.classification, "rolled_back_sql");
  assert.equal(result.allowedResolveFlag, "--rolled-back");
});

test("classifies exact committed postconditions as applied", () => {
  const result = classifyRecoveryState(committedState());
  assert.equal(result.classification, "committed_sql_unfinished_history");
  assert.equal(result.allowedResolveFlag, "--applied");
});

test("rejects a resolve mode that disagrees with classification", () => {
  const result = classifyRecoveryState(rolledBackState());
  assert.throws(() => assertRequestedMode(result, "--applied"), /does not match/);
});

expectFailure(
  "rejects a missing failed history row",
  rolledBackState({ historyRow: null }),
  /history row is missing/,
);

test("accepts only target-role ACL removal while preserving owner/runtime ACLs", () => {
  const before = aclState();
  const after = aclState({
    table_acl: before.table_acl.filter((entry) => entry.grantee !== "anon"),
  });
  assert.equal(ownerAndNonTargetAclMatch(before, after), true);
});

test("detects exact Supplier table-owner drift", () => {
  assert.equal(
    ownerAndNonTargetAclMatch(aclState(), aclState({ table_owner: "other_owner" })),
    false,
  );
});

test("detects an unexpected fourth-role table grant", () => {
  const before = aclState();
  const after = aclState({
    table_acl: [
      ...before.table_acl,
      {
        grantee: "unexpected_role",
        grantor: "runtime_owner",
        privilege_type: "SELECT",
        is_grantable: false,
      },
    ],
  });
  assert.equal(ownerAndNonTargetAclMatch(before, after), false);
});

test("detects loss of a runtime column grant", () => {
  assert.equal(
    ownerAndNonTargetAclMatch(aclState(), aclState({ column_acl: [] })),
    false,
  );
});
expectFailure(
  "rejects a migration checksum mismatch",
  rolledBackState({ historyRow: history({ checksum: "b".repeat(64) }) }),
  /checksum mismatch/,
);
expectFailure(
  "rejects an already-finished history row",
  rolledBackState({ historyRow: history({ finished_at: "2026-08-21T00:01:00.000Z" }) }),
  /not an unfinished/,
);
expectFailure(
  "rejects a previously rolled-back history row",
  rolledBackState({ historyRow: history({ rolled_back_at: "2026-08-21T00:01:00.000Z" }) }),
  /not an unfinished/,
);
expectFailure(
  "rejects a nonzero unfinished applied step count",
  rolledBackState({ historyRow: history({ applied_steps_count: 1 }) }),
  /applied_steps_count=0/,
);
expectFailure(
  "rejects a one-constraint partial state",
  committedState({ constraints: constraints().slice(0, 1) }),
  /partial, ambiguous, or unsupported/,
);
expectFailure(
  "rejects an unvalidated committed constraint",
  committedState({
    constraints: constraints().map((constraint, index) =>
      index === 0 ? { ...constraint, validated: false } : constraint,
    ),
  }),
  /partial, ambiguous, or unsupported/,
);
expectFailure(
  "rejects an unexpected constraint definition",
  committedState({
    constraints: constraints().map((constraint, index) =>
      index === 0 ? { ...constraint, definition: "CHECK (true)" } : constraint,
    ),
  }),
  /partial, ambiguous, or unsupported/,
);
expectFailure(
  "rejects committed constraints with extra catalog drift",
  committedState({ forwardCatalogMatches: false }),
  /partial, ambiguous, or unsupported/,
);
expectFailure(
  "rejects a missing Data API role",
  committedState({
    security: deniedSecurity({
      roles: deniedSecurity().roles.map((role, index) =>
        index === 0 ? { ...role, present: false } : role,
      ),
    }),
  }),
  /partial, ambiguous, or unsupported/,
);
expectFailure(
  "rejects a retained effective table privilege",
  committedState({
    security: deniedSecurity({
      roles: deniedSecurity().roles.map((role, index) =>
        index === 1 ? { ...role, retained_table_privileges: ["SELECT"] } : role,
      ),
    }),
  }),
  /partial, ambiguous, or unsupported/,
);
expectFailure(
  "rejects a retained effective column privilege",
  committedState({
    security: deniedSecurity({
      roles: deniedSecurity().roles.map((role, index) =>
        index === 2 ? { ...role, retained_column_privilege_count: 1 } : role,
      ),
    }),
  }),
  /partial, ambiguous, or unsupported/,
);
expectFailure(
  "rejects PUBLIC grants",
  committedState({ security: deniedSecurity({ public_table_grant_count: 1 }) }),
  /partial, ambiguous, or unsupported/,
);
expectFailure(
  "rejects unexpected RLS or policies",
  committedState({ security: deniedSecurity({ rls_enabled: true, policy_count: 1 }) }),
  /partial, ambiguous, or unsupported/,
);
expectFailure(
  "rejects Supplier table-owner drift",
  committedState({ security: deniedSecurity({ owner_acl_matches: false }) }),
  /partial, ambiguous, or unsupported/,
);
expectFailure(
  "rejects an unexpected fourth-role grant",
  committedState({ security: deniedSecurity({ owner_acl_matches: false }) }),
  /partial, ambiguous, or unsupported/,
);
expectFailure(
  "rejects loss of the approved runtime ACL posture",
  committedState({ security: deniedSecurity({ owner_acl_matches: false }) }),
  /partial, ambiguous, or unsupported/,
);
expectFailure(
  "rejects no-survivor classification without baseline parity",
  rolledBackState({ baselineCatalogMatches: false }),
  /partial, ambiguous, or unsupported/,
);
expectFailure(
  "rejects no-survivor classification without matching hashed prestate",
  rolledBackState({ prestateMatches: false }),
  /partial, ambiguous, or unsupported/,
);

console.log(`Supplier recovery validation complete: ${passed} passed, 0 failed`);
