# P3006 Revised Baseline Plan
## Database Schema Stabilization & Migration Safety

| **Author** | Muhammad Ashir Raza |
|------------|----------------------|
| **Date**   | August 14, 2026      |
| **Status** | For Expert Review    |
| **PR**     | #6 Feat Suppliers Persistence |

---

## 1. Purpose

To establish a clean, reproducible, and safe database baseline for the Valtriox platform. This plan addresses schema drift, migration safety, and production deployment guardrails. All actions are to be executed in a separate PR ΓÇö **not** mixed with the current suppliers work.

---

## 2. Off-site Logical Dumps (Supabase Free Tier)

**Purpose:** Create recoverable backups that are not dependent on Supabase's built-in snapshots.

**Steps:**

1. Install `pg_dump` locally (PostgreSQL client tools).
2. Run logical dump for schema + data + roles:
   ```bash
   PGPASSWORD=your_password pg_dump \
     -h aws-0-region.pooler.supabase.com \
     -p 6543 \
     -U postgres.your-project-ref \
     -d postgres \
     --schema-only > schema-dump.sql

   PGPASSWORD=your_password pg_dump \
     -h aws-0-region.pooler.supabase.com \
     -p 6543 \
     -U postgres.your-project-ref \
     -d postgres \
     --data-only --column-inserts > data-dump.sql

   PGPASSWORD=your_password pg_dump \
     -h aws-0-region.pooler.supabase.com \
     -p 6543 \
     -U postgres.your-project-ref \
     -d postgres \
     --roles-only > roles-dump.sql

3. Compress and store off-site (Google Drive / GitHub Secrets / S3).

4. Schedule weekly automated dumps via GitHub Actions (cron job) using supabase CLI or pg_dump with secrets.

Risk Mitigation:

Dump before any schema-altering operation.

Verify dump integrity by restoring to a local disposable DB.

Verification Criteria:

All three files are created without errors.

Restoration to a clean DB passes all tests.

Rollback Plan:

Restore from the latest dump files using psql.