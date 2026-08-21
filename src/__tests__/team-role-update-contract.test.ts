import { describe, expect, it } from "vitest";
import { updateMemberRoleApiSchema } from "@/lib/validations/schemas";

describe("Team role update payload contract", () => {
  it("accepts exactly one canonical built-in role name", () => {
    const result = updateMemberRoleApiSchema.safeParse({
      roleName: "viewer",
      updatedByRole: "platform_admin",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ roleName: "viewer" });
  });

  it("accepts exactly one database role id", () => {
    expect(updateMemberRoleApiSchema.safeParse({ roleId: "custom-role-id" }).success).toBe(true);
  });

  it.each([
    {},
    { roleId: null, roleName: "viewer" },
    { roleId: "custom-role-id", roleName: "viewer" },
  ])("rejects ambiguous or missing selectors: %o", (payload) => {
    expect(updateMemberRoleApiSchema.safeParse(payload).success).toBe(false);
  });
});
