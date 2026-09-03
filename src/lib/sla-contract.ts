export const ALLOWED_SLA_STATUSES = ["pending", "confirmed", "packed", "dispatched", "delivered"] as const;

export const ALLOWED_SLA_ROLES = [
  "sales_manager",
  "warehouse_manager",
  "support_agent",
  "inventory_clerk",
  "operations_lead",
  "logistics_coordinator",
] as const;

export const MAX_TIME_LIMIT_HOURS = 8760;

export interface SLARule {
  id: string;
  name: string;
  fromStatus: string;
  toStatus: string;
  timeLimitHours: number;
  responsibleRole: string;
  escalationAction: string;
  enabled: boolean;
}

type SLARuleValidationResult =
  | { valid: true; rule: SLARule }
  | { valid: false; reason: string };

export function validateSLARule(raw: Record<string, unknown>): SLARuleValidationResult {
  const id = raw.id;
  if (typeof id !== "string" || id.trim().length === 0) return { valid: false, reason: "missing id" };
  const name = raw.name;
  if (typeof name !== "string" || name.trim().length === 0) return { valid: false, reason: "missing name" };
  const fromStatus = raw.fromStatus;
  if (typeof fromStatus !== "string" || !ALLOWED_SLA_STATUSES.includes(fromStatus as any)) return { valid: false, reason: "invalid fromStatus" };
  const toStatus = raw.toStatus;
  if (typeof toStatus !== "string" || !ALLOWED_SLA_STATUSES.includes(toStatus as any)) return { valid: false, reason: "invalid toStatus" };
  const timeLimitHours = raw.timeLimitHours;
  if (typeof timeLimitHours !== "number" || !Number.isFinite(timeLimitHours) || timeLimitHours <= 0 || timeLimitHours > MAX_TIME_LIMIT_HOURS) return { valid: false, reason: "invalid timeLimitHours" };
  const responsibleRole = raw.responsibleRole;
  if (typeof responsibleRole !== "string" || !ALLOWED_SLA_ROLES.includes(responsibleRole as any)) return { valid: false, reason: "invalid responsibleRole" };
  const escalationAction = raw.escalationAction;
  if (typeof escalationAction !== "string" || escalationAction.trim().length === 0) return { valid: false, reason: "missing escalationAction" };
  const enabled = raw.enabled;
  if (typeof enabled !== "boolean") return { valid: false, reason: "invalid enabled" };

  return {
    valid: true,
    rule: {
      id,
      name,
      fromStatus,
      toStatus,
      timeLimitHours,
      responsibleRole,
      escalationAction,
      enabled,
    },
  };
}


