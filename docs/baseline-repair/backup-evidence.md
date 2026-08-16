# Backup Evidence

Date: 2026-08-15 (updated)

## 1. Backup Artifacts

Full production backup (custom format -Fc, session pooler port 5432):

- Schema dump: valtriox-schema-20260815.dump
  SHA-256: [PENDING: Ashir command ke baad bharega]
- Data dump: valtriox-data-20260815.dump
  SHA-256: [PENDING: Ashir command ke baad bharega]
- Dump date/time (UTC): [PENDING]

Catalog reference data (already committed, hashes in sanitized-manifest.md):

- backups/production-catalog.json
- backups/catalog-tables.json
- backups/roles.json
- backups/table-row-counts.json

## 2. Off-Site Encrypted Copy

- Encryption: GPG AES256 symmetric
- Encrypted files:
  - valtriox-schema-20260815.dump.gpg SHA-256: [PENDING]
  - valtriox-data-20260815.dump.gpg SHA-256: [PENDING]
- Off-site target: [PENDING: Backblaze B2 / S3 / documented local encrypted disk]
- Upload receipt (timestamp + object checksum match): [PENDING]

Note: Local encrypted folder alone is NOT off-site. Agar cloud option use nahi
hua to yeh limitation explicitly yahan document hogi aur expert ko bataya jayega.

## 3. Restore Proof

Restore rehearsed on disposable database:

- Restore commands run: [PENDING: date + command list]
- Tables after restore: [PENDING: expected 40]
- Row counts match vs table-row-counts.json: [PENDING: yes/no + diffs]
- Output log location: [PENDING]

## 4. Integration Test Evidence

CI integration-tests job (real postgres:16 service, baseline replay via
scripts/baseline/replay-baseline.cjs):

- Branch: chore/baseline-repair-p3006
- Commit: [PENDING: will update after new commit and push]
- CI run URL: [PENDING: will update after new push triggers CI]
- Result: PASS (all 5 jobs green: TypeScript Check, Tests, Build, Lint,
  Integration Tests) -- verified at base SHA 4daa5ed, run 31905630108.
- Test count: 4 baseline replay validation tests (40 tables, suppliers,
  Organization, ValtrioxTeamMember).

No credentials or raw production data committed to GitHub. Sirf sanitized
catalog JSONs committed hain, hashes sanitized-manifest.md mein.
