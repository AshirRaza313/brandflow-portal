import { isUnlimitedRole } from "@/lib/plan-limits";

export function getNotificationAudienceWhere(authCtx: {
  userId: string;
  organizationId: string;
  role: string;
}) {
  const where: any = {
    orgId: authCtx.organizationId,
    OR: [
      { userId: null },
      { userId: authCtx.userId },
    ],
  };
  if (isUnlimitedRole(authCtx.role)) {
    where.NOT = {
      type: {
        in: [
          "storage_warning",
          "storage_critical",
          "subscription_renewal",
          "subscription_expired",
          "trial_expired",
          "trial_expiring",
        ],
      },
    };
  }
  return where;
}
