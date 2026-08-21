# Baseline Evidence Register

This file distinguishes automated repository evidence from production release
evidence. A checked box requires a reviewable artifact and exact command/run
output; a plan or local assertion is not evidence.

## Automated repository evidence

- [x] Immutable baseline contains the approved 40-table repository schema.
- [x] Clean PostgreSQL 16 `prisma migrate deploy` and `migrate status` are in CI.
- [x] Strict catalog comparison validates every approved table, column metadata,
  constraint, index, provenance field, and content hash.
- [x] Synthetic Path B starts with schema/data but no Prisma history, verifies the
  pinned baseline precondition, proves history-only baseline adoption leaves schema
  and data unchanged, then applies the exact Supplier forward migration on the same
  populated target. It records exact two-row history, unchanged data fingerprints,
  reviewed constraint/security postconditions, and a final no-op deploy.
- [x] Vercel build no longer runs `prisma db push`.

Exact head SHA, run URL, artifact IDs, and artifact SHA-256 values belong in the
PR description after the final pushed commit. CI artifacts contain only disposable
PostgreSQL evidence—never production credentials or row data.

## Live production catalog evidence

- [ ] Trusted capture executed from an approved `main` commit or pinned local checkout.
- [ ] Source identity verified: production project ref, database, login role,
  connected role, host, port, PostgreSQL version, UTC capture time, and code SHA.
- [ ] Full current-format catalog artifact retained with SHA-256.
- [ ] Production-vs-baseline comparator output retained.
- [ ] Explicit presence/absence output retained for all nine previously reported
  tables: `Subscriber`, `SubscriberList`, `SubscriberListMembership`, `Campaign`,
  `EmailCampaign`, `EmailDelivery`, `SocialAccount`, `SocialPost`, `ScheduledJob`.

Until these boxes are complete, the only valid statement is: migration SQL,
committed fixture, and repository Prisma schema agree on the same 40-table set.
Live-production Marketing-table presence remains unresolved.

## Production backup and restore evidence

- [ ] Real production schema+data custom-format dump created with `pg_dump -Fc`.
- [ ] Approved globals/roles export created without committing secrets/passwords.
- [ ] Artifact timestamps and SHA-256 values recorded.
- [ ] Backup encrypted before leaving the operator machine.
- [ ] Encrypted off-site object receipt/path and SHA-256 recorded.
- [ ] Those exact artifacts restored to a disposable database.
- [ ] Restore log, exact 40-table catalog comparison, and per-table row-count/data
  fingerprint parity retained.
- [ ] Restored-clone Path B adoption rehearsal completed with clean status and
  unchanged application data.

The older 42-byte empty rehearsal data file was not a production backup and is
not accepted as recovery evidence.

## External configuration evidence

- [ ] GitHub environment `production-evidence` restricts deployment branches to
  `main`, requires an independent reviewer, and prevents self-review.
- [ ] Environment secrets are scoped to a read-only production database user:
  `PRODUCTION_READONLY_DATABASE_URL`, `PRODUCTION_EXPECTED_HOST`,
  `PRODUCTION_EXPECTED_DB_USER`, and, for a pooler, `PRODUCTION_EXPECTED_DB_ROLE`.
- [ ] Preview/staging and Production Vercel environments point to distinct Supabase
  project refs; sanitized refs/screenshots are retained.

## Release decision

- [ ] Independent human approval recorded.
- [ ] No production resolve/deploy/db-push occurred before every required box above.
