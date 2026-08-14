-- Fix ValtrioxTeamInvitation FK constraint:
-- Set NULL on any invitedBy values that don't match a ValtrioxTeamMember.id
-- This allows the FK constraint to be added successfully by prisma db push
UPDATE "ValtrioxTeamInvitation"
SET "invitedBy" = NULL
WHERE "invitedBy" IS NOT NULL
  AND "invitedBy" NOT IN (SELECT id FROM "ValtrioxTeamMember");
