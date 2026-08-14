import { describe, it, expect } from "vitest";
import {
  isPlatformRole,
  canAssignRole,
  isTeamMemberRole,
  isClientRole,
  getRoleByName,
} from "@/lib/roles";

describe("platform role alignment", () => {
  it("isPlatformRole returns true for all six VTM roles", () => {
    for (const role of [
      "platform_owner",
      "platform_admin",
      "platform_engineer",
      "platform_support",
      "platform_sales",
      "platform_marketing",
    ]) {
      expect(isPlatformRole(role)).toBe(true);
    }
  });

  it("isPlatformRole returns false for org-level roles", () => {
    for (const role of ["brand_owner", "brand_admin", "operations_manager", "viewer"]) {
      expect(isPlatformRole(role)).toBe(false);
    }
  });

  it("canAssignRole blocks platform roles from brand owner", () => {
    const result = canAssignRole(
      "brand_owner",
      "owner@example.com",
      "platform_engineer",
      "admin@valtriox.com",
    );
    expect(result).toEqual({
      allowed: false,
      reason: "Platform roles can only be assigned by the Valtriox owner.",
      code: "PLATFORM_ROLE_BLOCKED",
    });
  });

  it("canAssignRole allows platform roles from admin email owner", () => {
    const result = canAssignRole(
      "platform_owner",
      "admin@valtriox.com",
      "platform_engineer",
      "admin@valtriox.com",
    );
    expect(result).toEqual({ allowed: true });
  });

  it("isTeamMemberRole returns false for platform roles", () => {
    expect(isTeamMemberRole("platform_engineer")).toBe(false);
    expect(isTeamMemberRole("platform_marketing")).toBe(false);
  });

  it("isClientRole returns false for platform roles", () => {
    expect(isClientRole("platform_engineer")).toBe(false);
    expect(isClientRole("platform_marketing")).toBe(false);
  });

  it("getRoleByName does not grant operations to four platform roles", () => {
    expect(getRoleByName("platform_engineer")?.permissions.operations).toBeUndefined();
    expect(getRoleByName("platform_support")?.permissions.operations).toBeUndefined();
    expect(getRoleByName("platform_sales")?.permissions.operations).toBeUndefined();
    expect(getRoleByName("platform_marketing")?.permissions.operations).toBeUndefined();
  });
});
