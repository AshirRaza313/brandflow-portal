# P3006 Offsite Backup Recommendation

Date: 2026-08-14

## Roles Backup

Use direct/session connection on port 5432 only, never transaction pooler 6543.

Command example:

pg_dumpall --roles-only --dbname "postgresql://postgres:password@db.project-ref.supabase.co:5432/postgres" > valtriox-roles-20260814.sql

## Offsite Storage Options

- Backblaze B2 (recommended, cheap and S3-compatible)
- AWS S3 with versioning and lifecycle rules
- Local encrypted disk if no cloud option is acceptable

Do not store backups in GitHub Secrets or repository.

## Encryption

Encrypt the dump before upload:

gpg --symmetric --cipher-algo AES256 valtriox-roles-20260814.sql

## Backup Retention

Keep at least 14 days of daily backups for roles and schema-only dumps.
