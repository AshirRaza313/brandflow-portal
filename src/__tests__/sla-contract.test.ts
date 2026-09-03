import { describe, it, expect } from "vitest";
import { ALLOWED_SLA_ROLES, ALLOWED_SLA_STATUSES, MAX_TIME_LIMIT_HOURS, validateSLARule } from "@/lib/sla-contract";

describe("SLA Contract validateSLARule", () => {
  const validRule = {
    id: "rule-1",
    name: "Order Confirmation",
    fromStatus: "pending",
    toStatus: "confirmed",
    timeLimitHours: 24,
    responsibleRole: "sales_manager",
    escalationAction: "Notify team lead",
    enabled: true,
  };

  it("accepts a valid rule", () => {
    const result = validateSLARule(validRule);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.rule).toEqual(validRule);
  });

  it("accepts all allowed roles (including editor roles)", () => {
    for (const role of ALLOWED_SLA_ROLES) {
      const result = validateSLARule({ ...validRule, responsibleRole: role });
      expect(result.valid).toBe(true);
    }
  });

  it("rejects invalid role", () => {
    const result = validateSLARule({ ...validRule, responsibleRole: "nonexistent_role" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("invalid responsibleRole");
  });

  it("accepts all allowed statuses", () => {
    for (const status of ALLOWED_SLA_STATUSES) {
      const result = validateSLARule({ ...validRule, fromStatus: status, toStatus: "confirmed" });
      expect(result.valid).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = validateSLARule({ ...validRule, fromStatus: "invalid_status" });
    expect(result.valid).toBe(false);
  });

  it("rejects timeLimitHours > MAX_TIME_LIMIT_HOURS", () => {
    const result = validateSLARule({ ...validRule, timeLimitHours: MAX_TIME_LIMIT_HOURS + 1 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("invalid timeLimitHours");
  });

  it("rejects non-positive timeLimitHours", () => {
    const result = validateSLARule({ ...validRule, timeLimitHours: 0 });
    expect(result.valid).toBe(false);
  });

  it("rejects missing escalationAction", () => {
    const result = validateSLARule({ ...validRule, escalationAction: "" });
    expect(result.valid).toBe(false);
  });
});
