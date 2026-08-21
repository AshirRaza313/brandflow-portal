# Production Backup, Encryption, and Restore Gate

This is an operator procedure, not evidence that a backup already exists.

## Create the backup

Use an exact validated direct/session connection on port 5432 and a local
`PGPASSFILE` (or interactive password prompt). Do not place passwords in command
history, repository files, GitHub Secrets used by PR code, or process arguments.

Create one full custom-format database dump containing schema and data:

`pg_dump --format=custom --no-owner --no-privileges --file valtriox-production.dump "$PRODUCTION_URL"`

Create an approved roles/globals export separately where permissions allow:

`pg_dumpall --roles-only --file valtriox-roles.sql --database "$PRODUCTION_URL"`

If Supabase Storage contains application objects, export/inventory those objects
separately; a PostgreSQL dump does not contain bucket files.

## Hash, encrypt, and store off-site

1. Compute SHA-256 for the unencrypted dump and roles file.
2. Encrypt both with the team's approved tool/key (for example age or GPG).
3. Compute SHA-256 for each encrypted object.
4. Upload encrypted objects to versioned off-site storage.
5. Retain the provider receipt/object version, UTC timestamp, size, and encrypted hash.

GitHub is not backup storage. Never commit dumps or upload production data as a
GitHub Actions artifact.

## Restore rehearsal

Restore the exact custom-format artifact to an isolated disposable database:

`pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$RESTORE_URL" valtriox-production.dump`

Then retain:

- restore exit code/log;
- source and restored full-catalog comparison;
- exact per-table row counts and data fingerprints;
- explicit verification of `_prisma_migrations` state;
- restored-clone Path B adoption evidence;
- post-adoption `migrate status` and no-op deploy output.

Production baseline adoption remains blocked until the encrypted off-site receipt
and this exact restore rehearsal are independently reviewed.
