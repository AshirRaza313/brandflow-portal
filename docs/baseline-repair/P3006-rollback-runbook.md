# P3006 Rollback Runbook

Date: 2026-08-15 (updated)
Owner: Muhammad Ashir Raza
Approver: Abdul Nafay (expert reviewer)
Branch: chore/baseline-repair-p3006

Scope: Yeh runbook production baseline adoption ke failure scenarios ko cover
karta hai. Production par koi bhi action sirf expert approval ke baad hoga.

## 1. Pre-Requisites

- Disposable rehearsal database available (Supabase temp project ya local Docker postgres).
- Full production backup verified: schema dump + data dump + off-site encrypted copy.
  Evidence: docs/baseline-repair/backup-evidence.md
- Session pooler connection on port 5432 available (transaction pooler 6543 use nahi karna,
  deprecated direct db.* host use nahi karna).
- No `prisma migrate dev` on staging ya production. Sirf disposable rehearsal DB par.
- `npx prisma migrate status` output screenshot/output saved before every action.
- Expert (Abdul Nafay) ka written GO production par har step se pehle.

## 2. Identify Current Migration State

Command:

npx prisma migrate status --schema prisma/schema.prisma

Expected healthy state before baseline adoption:

- Production database: exactly one applied migration record matching
  20260101000000_baseline (post-adoption).
- Pre-adoption state: existing migration history intact, zero failed entries.

Checkpoint CP0: Agar "migration failed" ya "database is not empty" dikhe,
BASELINE ADOPTION ROKEIN. Yeh already-broken state hai, adoption se pehle
expert se clarify karein.

## 3. Baseline Adoption Sequence (Staging First)

Staging/production par sirf yeh allowed hai:

npx prisma migrate deploy

Order:

1. CP1 - Isolated rehearsal DB par `migrate deploy` chalao. 40 tables verify karo.
2. CP2 - Integration tests chalao us rehearsal DB ke khilaf (INTEGRATION_DATABASE_URL set).
   Expected: all tests pass, zero failures.
3. CP3 - Row counts compare karo `backups/table-row-counts.json` se. Drift sirf
   tab acceptable hai agar documented ho.
4. CP4 - Expert approval checkpoint. Rehearsal green hone ka evidence expert ko
   bhejo. Approval ke baghair production par kuch nahi.
5. Production par `migrate deploy` (ek baar, rollback plan ready ke saath).

## 4. Failure Checkpoints and Immediate Actions

- CP0 fail (broken state): adoption roko, expert ko status output bhejo.
- CP1/CP2 fail (rehearsal): zero production impact. Rehearsal DB drop karo,
  root cause fix karo, dobara CP1 se shuru.
- Production deploy fail: Section 5 ya 6 follow karo, decision expert ke saath.

## 5. Rollback Option A - Compensating Migration (Preferred)

Jab: naya migration partially applied ho aur data loss nahi hua.

Steps:

1. Failed migration ka exact SQL nikalo (prisma/migrations/<name>/migration.sql).
2. Uska reverse SQL likho (drop constraints, drop policy, drop table sirf tab
   agar woh migration ne create kiya).
3. New forward migration folder banao: prisma/migrations/<timestamp>_rollback_<name>/
   with reverse SQL.
4. Rehearsal DB par apply + verify (CP1-CP3).
5. Expert approval, phir production `migrate deploy`.

Note: Baseline migration (20260101000000_baseline) immutable hai. Usko kabhi
edit nahi karna. Agar baseline khud ghalt hai to Option B use hota hai.

## 6. Rollback Option B - Restore From Backup

Jab: data corruption ya baseline khud reject karna ho.

Pre-steps:

1. Application maintenance mode ON (Vercel deployment pause ya env-based flag).
2. Expert written approval.

Restore commands (session pooler, port 5432, placeholders apne credentials se
replace karo):

pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname "<SESSION_POOLER_URL>" \
  valtriox-schema-<date>.dump

pg_restore --data-only --disable-triggers --no-owner --no-privileges \
  --dbname "<SESSION_POOLER_URL>" \
  valtriox-data-<date>.dump

Custom-format dumps use karo (-Fc), plain SQL nahi, taake parallel/ selective
restore possible ho.

## 7. Owners and Escalation

- Executor: Muhammad Ashir Raza
- Approver/Escalation: Abdul Nafay (expert reviewer)
- Production execution ke liye dono ka agreement zaroori hai.
- Har production action se pehle aur baad mein `migrate status` output save karo.

## 8. Post-Rollback Verification

1. npx prisma migrate status - clean, expected migrations applied.
2. Table count query: expected 40 public tables (pre-PR6 state) ya
   post-PR6 expected count.
3. Row counts vs backups/table-row-counts.json compare.
4. Application health: /api/health ya equivalent endpoint 200.
5. Suppliers route authorization smoke test (PR6 ke baad).
6. Evidence (commands + outputs) backup-evidence.md mein append karo aur
   expert ko final report bhejo.
