# Backup Evidence

Date: 2026-08-16

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

## 3. Restore Proof

Baseline replay verified on disposable rehearsal database:

- Command: node scripts/baseline/replay-baseline.cjs
- Result: Tables after baseline replay: 40
- Integration tests: 11/11 passed zero skipped on isolated PostgreSQL.
- Rehearsal database was empty before restore, confirming clean replay.

## 4. Integration Test Evidence

- CI integration-tests job: real postgres:16 service, prisma migrate deploy + migrate status.
- Latest SHA: 515633d (will update after final commit)
- CI run URL: PENDING latest GitHub Actions link.

No credentials or raw production data committed to GitHub.

## 5. Production Catalog Comparison

- Script: scripts/baseline/compare-catalogs.cjs
- Production full catalog: backups/production-full-catalog.json (40 tables)
- Rehearsal full catalog: backups/rehearsal-full-catalog.json (40 tables)
- Result: NO_DIFFS (exact structural match - columns, defaults, nullability,
  constraints, FKs, indexes)
- Manual supplier CHECK constraints were removed from rehearsal before
  comparison to match production pre-PR6 state.

## 6. Populated Production-Like Path B Rehearsal

- Rehearsal DB seeded with representative Organization, User,
  OrganizationMember, and Supplier rows.
- Command: npx prisma migrate resolve --schema prisma/schema.prisma --applied 20260101000000_baseline
- Result: Migration 20260101000000_baseline marked as applied.
- Command: npx prisma migrate status --schema prisma/schema.prisma
- Result: Database schema is up to date! (1 migration found)
- Row counts captured before and after resolve, no data loss detected.

## 5. Production Catalog Comparison

- Script: scripts/baseline/compare-catalogs.cjs
- Production full catalog: backups/production-full-catalog.json (40 tables)
- Rehearsal full catalog: backups/rehearsal-full-catalog.json (40 tables)
- Result: NO_DIFFS (exact structural match - columns, defaults, nullability,
  constraints, FKs, indexes)
- Manual supplier CHECK constraints were removed from rehearsal before
  comparison to match production pre-PR6 state.

## 6. Populated Production-Like Path B Rehearsal

- Rehearsal DB seeded with representative Organization, User,
  OrganizationMember, and Supplier rows.
- Command: npx prisma migrate resolve --schema prisma/schema.prisma --applied 20260101000000_baseline
- Result: Migration 20260101000000_baseline marked as applied.
- Command: npx prisma migrate status --schema prisma/schema.prisma
- Result: Database schema is up to date! (1 migration found)
- Row counts captured before and after resolve, no data loss detected.