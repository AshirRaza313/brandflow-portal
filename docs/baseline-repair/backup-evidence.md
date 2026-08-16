# Backup Evidence

Date: 2026-08-16 (updated)
Owner: Muhammad Ashir Raza
Reviewer: Abdul Nafay

## 1. Backup Artifacts

Full rehearsal database backup generated via scripts/baseline/export-sql-dump.cjs.

- Schema dump: valtriox-schema-20260816.sql
  - Size: 48771 bytes
  - SHA-256: 73F8BA82EE7C9FC5B5C5357A7CEDAC9685028097F1D99EA979DB6F1C6BB27AEA
- Data dump: valtriox-data-20260816.sql
  - Size: 42 bytes (rehearsal DB empty, header only)
  - SHA-256: BAACF75D189780AE0C731B55E5AA9EC5B78C99FA30C767ABBA7A2CFCD315EDEB
- Roles dump: valtriox-roles-20260816.sql
  - Size: 2953 bytes
  - SHA-256: 475D8573F7FDD3C2922259C045D759B385205D315B5A6CD42D0F7D46EADCE776

## 2. Off-Site Encrypted Copy

- Encryption pending. Local SQL files are in backups/ folder, Git ignored.
- Off-site target not yet configured. Once encrypted, SHA-256 and receipt will be recorded here.

## 3. Restore Proof (Path A - Empty Database)

Baseline replay verified on disposable rehearsal database:

- Command: npx prisma migrate deploy (CI integration-tests job)
- Result: 40 public tables created, _prisma_migrations table with baseline entry
- Integration tests: 11/11 passed, zero skipped on isolated PostgreSQL
- Rehearsal database was empty before restore, confirming clean replay
- CI commit SHA: PENDING (update after push)
- CI run URL: PENDING (update after push)

No credentials or raw production data committed to GitHub.

## 4. Integration Test Evidence

- CI integration-tests job: real postgres:16 service, prisma migrate deploy + migrate status
- Latest local commit: f2cdd56 (catalog scripts safety guards + CI comparison)
- Fixture commit: 4b9c2db (expected baseline catalog, 40 tables)
- Tests: 188 unit + 11 integration = 199 total

## 5. Catalog Comparison Evidence

- Script: scripts/baseline/compare-catalogs.cjs
- Expected baseline fixture: tests/fixtures/expected-baseline-catalog.json (40 tables, committed to git)
- CI captures live catalog from replayed baseline, compares against fixture
- Any structural diff causes CI failure (non-zero exit)
- CI artifacts uploaded: backups/ci-captured-catalog.json + docs/baseline-repair/catalog-comparison.txt
- Artifact retention: 30 days
- Current result: NO_DIFFS (exact structural match - columns, constraints, indexes)

## 6. Path B Evidence (Populated Production-Like Rehearsal)

- Rehearsal DB seeded with representative rows: Organization, User, OrganizationMember, Supplier
- Script: scripts/baseline/seed-rehearsal-for-pathb.cjs (guarded with safety-guard.cjs)
- Before/after row counts: separate files (before-resolve-row-counts.json, after-resolve-row-counts.json)
- Guarded wrapper: scripts/baseline/guarded-migrate-resolve.cjs (proves exact target, captures delta)
- Command: npx prisma migrate resolve --applied 20260101000000_baseline
- Expected delta: _prisma_migrations table only (1 row added), zero data loss in other tables
- Status: PENDING (requires Ashir to run on rehearsal DB and provide evidence)

## 7. Marketing-Table Discrepancy Finding

- Expert reported 9 Marketing tables in earlier audit.
- Investigation: production catalog (40 tables), baseline SQL, and CI fixture (40 tables) all confirm ZERO marketing/campaign/promo/advert tables.
- Conclusion: Marketing tables never existed in this project baseline schema. Earlier audit report was incorrect or referenced a different project state.
- No action needed. No deleted tables to restore.

## 8. Safety Guards Summary

All mutating scripts now use shared safety-guard.cjs validation:

- validateRehearsalUrl: rejects production hostname, pooler pattern, validates CI/staging
- validateProductionUrl: rejects rehearsal, transaction pooler, validates exact production ref
- CodeQL fix: endsWith() instead of indexOf() for pooler hostname matching

Guarded scripts (7 total):
- scripts/baseline/safety-guard.cjs (shared module)
- scripts/baseline/seed-rehearsal-for-pathb.cjs
- scripts/baseline/drop-manual-supplier-constraints.cjs
- scripts/baseline/export-sql-dump.cjs
- scripts/baseline/capture-production-catalog.cjs
- scripts/baseline/capture-row-counts.cjs
- scripts/baseline/guarded-migrate-resolve.cjs (new)
