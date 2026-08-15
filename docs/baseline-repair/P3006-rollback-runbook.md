# P3006 Rollback Runbook

Date: 2026-08-15
Owner: Muhammad Ashir Raza
Branch: chore/baseline-repair-p3006

## 1. Pre-Requisites

- Disposable rehearsal database available.
- Off-site encrypted backup verified.
- Direct/session database connection on port 5432.
- No `prisma migrate dev` on staging or production.

## 2. Identify Current Migration State

```bash
npx prisma migrate status --schema prisma/schema.prisma