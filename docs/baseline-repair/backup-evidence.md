# Backup Evidence

Date: 2026-08-15

## External Off-Site Backup Location

- Local encrypted folder: C:\Users\Aashir\Documents\ValtrioxBackups
- Files stored:
  - catalog-tables.json
  - roles.json
  - valtriox-catalog-20260815.zip

## Sanitized Manifest

- SHA-256 hashes recorded in docs/baseline-repair/sanitized-manifest.md
- No credentials or raw data committed to GitHub.

## Restore Proof

- Disposable Supabase rehearsal database replayed baseline successfully.
- Tables after baseline replay: 40.
- Integration tests: 7/7 passed on isolated rehearsal database.