import { describe, it, expect } from "vitest";
import { isPlatformRole } from "@/lib/roles";

describe("platform role helpers", () => {
  it("isPlatformRole returns true for platform_owner, platform_admin, valtriox_team, legacy owner/admin", () => {
    for (const role of ["platform_owner", "platform_admin", "valtriox_team", "owner", "admin"]) {
      expect(isPlatformRole(role)).toBe(true);
    }
  });

  it("isPlatformRole returns false for org-level roles and unsupported VTM roles", () => {
    for (const role of [
      "brand_owner",
      "brand_admin",
      "operations_manager",
      "viewer",
      "platform_engineer",
      "platform_support",
      "platform_sales",
      "platform_marketing",
    ]) {
      expect(isPlatformRole(role)).toBe(false);
    }
  });
});
