# Supplier Table RLS and Grants Posture

Date: 2026-08-15

## Current Posture

- Table: public.suppliers
- RLS: Not enabled yet.
- Grants: anon and authenticated revoked SELECT/INSERT/UPDATE/DELETE on suppliers table.
- Prisma runtime role: uses database owner privileges (no dedicated app role yet).

## Required Final Posture for Production

- Enable RLS on public.suppliers.
- Create policy: only server-side Prisma runtime role can SELECT/INSERT/UPDATE/DELETE.
- Do NOT use Supabase Auth identities or auth.uid().
- anon and authenticated roles must have zero privileges on suppliers table.
- Document actual Prisma runtime role name and verify CRUD with integration tests.

## Implementation Plan

This will be implemented in PR #6 after rebase, as a reviewed forward migration with:

ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "server_full_access" ON "public"."suppliers"
  USING (current_user = '<prisma_runtime_role>')
  WITH CHECK (current_user = '<prisma_runtime_role>');

Replace <prisma_runtime_role> with actual role after staging verification.