# Production baseline parity evidence — 2026-08-21

This directory contains a sanitized, read-only capture from the known production
Supabase project. It was captured at code SHA
`7870dcab0cdff0a5837b014452021e64c4791eb3` through the persistent
`valtriox_evidence_ro` role using a repeatable-read, read-only transaction and
strict certificate and hostname verification.

The capture contains schema metadata only. It contains no connection URL,
credential, token, private key, or application row data.

## Verified result

- Production catalog: 40 application tables, 576 columns, 88 constraints, and
  160 indexes.
- Production versus the reviewed baseline fixture: `NO_DIFFS`.
- The nine previously reported Marketing table names were each queried
  explicitly and are absent in this production project.
- Exact-head CI run `32460618545` replayed the baseline through Prisma on a
  disposable PostgreSQL database and passed all validation jobs, including the
  aggregate `Baseline Validation Gate`.

Raw PostgreSQL ordinal numbers are not required to be contiguous because
dropped historical columns leave physical gaps. The comparator validates that
ordinals are positive and unique and compares the relative order of all current
columns. This avoids manufacturing deleted columns while still detecting a real
column-order change.

## Files

- `production-full-catalog.json`: ordered columns and complete current
  constraints/index definitions with source and TLS provenance.
- `marketing-table-evidence.json`: explicit presence/absence result for all nine
  disputed names.
- `catalog-comparison.txt`: exact comparison output (`NO_DIFFS`).
- `manifest.json`: file hashes, source identity, counts, and remaining gates.

This is catalog-parity evidence, not a data backup or restore rehearsal. The
verified full production backup/restore, encrypted off-site receipt, and final
human approval remain mandatory before any production migration action.
