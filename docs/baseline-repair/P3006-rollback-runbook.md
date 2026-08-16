# P3006 Rollback Runbook

Date: 2026-08-16 (updated)
Owner: Muhammad Ashir Raza
Approver: Abdul Nafay (expert reviewer)
Branch: chore/baseline-repair-p3006

Scope: Yeh runbook production baseline adoption ke failure scenarios ko cover karta hai. Production par koi bhi action sirf expert approval ke baad hoga.

## 1. Pre-Requisites

- Disposable rehearsal database available (Supabase temp project ya local Docker postgres).
- Full production backup verified: schema dump + data dump + off-site encrypted copy. Evidence: docs/baseline-repair/backup-evidence.md
- Session pooler connection on port 5432 available (transaction pooler 6543 use nahi karna, deprecated direct db.* host use nahi karna).
- No `prisma migrate dev` on staging ya production. Sirf disposable rehearsal DB par.
- `npx prisma migrate status` output screenshot/output saved before every action.
- Expert (Abdul Nafay) ka written GO production par har step se pehle.

## 2. Identify Current Migration State

Command: npx prisma migrate status --schema prisma/schema.prisma

Expected healthy state before baseline adoption:
- Production database: exactly one applied migration record matching 20260101000000_baseline (post-adoption).
- Pre-adoption state: existing migration history intact, zero failed entries.

Checkpoint CP0: Agar "migration failed" ya "database is not empty" dikhe, BASELINE ADOPTION ROKEIN. Yeh already-broken state hai, adoption se pehle expert se clarify karein.

## 3. Path A - Empty Database (Fresh Supabase Project ya Disposable Docker)

Yeh path use karo jab target database bilkul empty ho (zero tables, no data).

Steps:
1. npx prisma migrate status run karo. Expected: Database is empty ya zero migrations.
2. npx prisma migrate deploy run karo. Yeh baseline migration SQL replay karega aur _prisma_migrations table bhi create karega. Expected: 40 tables created, baseline marked as applied.
3. npx prisma migrate status verify karo. Expected: 20260101000000_baseline status = Applied.
4. Integration tests chalao (INTEGRATION_DATABASE_URL set karo): npx vitest run tests/integration. Expected: all pass, zero failures.
5. Row counts capture karo aur backups/table-row-counts.json se compare karo. Empty DB mein row counts zero honge - yeh expected hai.
6. Expert approval checkpoint. Evidence bhejo.

Path A CI verification: GitHub Actions integration-tests job automatically proves this path on every PR push (postgres:16 service, migrate deploy, 11 integration tests).

## 4. Path B - Existing Populated Database (Production ya Staging with Data)

Yeh path use karo jab target database mein already 40 tables aur data hai (jaise production Supabase). Baseline migration ka SQL already manually ya db.push se applied ho chuka hai, lekin _prisma_migrations table nahi hai.

Steps:
1. npx prisma migrate status run karo. Expected: _prisma_migrations table does not exist ya similar message. Table count already 40 hona chahiye.
2. Verify karo ke existing schema baseline se match karta hai:
   - Production catalog capture: node scripts/baseline/capture-production-catalog.cjs
   - Rehearsal catalog capture: node scripts/baseline/capture-full-catalog.cjs
   - Compare: node scripts/baseline/compare-catalogs.cjs
   - Result must be NO_DIFFS.
3. Full backup le lo, encrypted off-site receipt mandatory. Row counts capture karo before resolve: node scripts/baseline/capture-row-counts.cjs
4. Baseline ko Prisma history mein applied mark karo (guarded wrapper): node scripts/baseline/guarded-migrate-resolve.cjs 20260101000000_baseline. Yeh automatically: target validate, before counts, migrate resolve, after counts, delta compare karega. Expected: zero unexpected deltas.
5. Verify migrate status: npx prisma migrate status --schema prisma/schema.prisma. Expected: Database schema is up to date!
6. Row counts dobara capture karke compare karo. Data loss zero hona chahiye. before-resolve-row-counts.json vs after-resolve-row-counts.json
7. Integration tests chalao. Expected: all pass.
8. Expert approval checkpoint. Evidence bhejo.

## 5. Failure Checkpoints and Immediate Actions

- CP0 fail (broken state): adoption roko, expert ko status output bhejo.
- CP1/CP2 fail (rehearsal): zero production impact. Rehearsal DB drop karo, root cause fix karo, dobara se shuru.
- Production deploy fail: Section 6 ya 7 follow karo, decision expert ke saath.

## 6. Rollback Option A - Compensating Migration (Preferred)

Jab: naya migration partially applied ho aur data loss nahi hua.

Steps:
1. Failed migration ka exact SQL nikalo (prisma/migrations/<name>/migration.sql).
2. Uska reverse SQL likho (drop constraints, drop policy, drop table sirf tab agar woh migration ne create kiya).
3. New forward migration folder banao: prisma/migrations/<timestamp>_rollback_<name>/ with reverse SQL.
4. Rehearsal DB par apply + verify (CP1-CP3).
5. Expert approval, phir production migrate deploy.

Note: Baseline migration (20260101000000_baseline) immutable hai. Usko kabhi edit nahi karna. Agar baseline khud ghalt hai to Option B use hota hai.

## 7. Rollback Option B - Restore From Backup

Jab: data corruption ya baseline khud reject karna ho.

Pre-steps:
1. Application maintenance mode ON (Vercel deployment pause ya env-based flag).
2. Expert written approval.

Restore commands (session pooler, port 5432, placeholders apne credentials se replace karo):

pg_restore --clean --if-exists --no-owner --no-privileges --dbname "<SESSION_POOLER_URL>" valtriox-schema-<date>.dump

pg_restore --data-only --disable-triggers --no-owner --no-privileges --dbname "<SESSION_POOLER_URL>" valtriox-data-<date>.dump

Custom-format dumps use karo (-Fc), plain SQL nahi, taake parallel/selective restore possible ho.

## 8. Owners and Escalation

- Executor: Muhammad Ashir Raza
- Approver/Escalation: Abdul Nafay (expert reviewer)
- Production execution ke liye dono ka agreement zaroori hai.
- Har production action se pehle aur baad mein migrate status output save karo.

## 9. Post-Rollback Verification

1. npx prisma migrate status - clean, expected migrations applied.
2. Table count query: expected 40 public tables (pre-PR6 state) ya post-PR6 expected count.
3. Row counts vs backups/table-row-counts.json compare.
4. Application health: /api/health ya equivalent endpoint 200.
5. Suppliers route authorization smoke test (PR6 ke baad).
6. Evidence (commands + outputs) backup-evidence.md mein append karo aur expert ko final report bhejo.
