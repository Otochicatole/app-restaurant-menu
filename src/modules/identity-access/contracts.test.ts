import { describe, expect, it } from "vitest";
import { changePasswordCommandSchema, loginCommandSchema } from "./contracts";

describe("identity contracts", () => {
  it("normalizes login emails at every transport boundary", () => {
    expect(
      loginCommandSchema.parse({ email: "  ADMIN@Example.TEST ", password: "password123" }),
    ).toEqual({ email: "admin@example.test", password: "password123" });
  });

  it("rejects a password confirmation mismatch", () => {
    const result = changePasswordCommandSchema.safeParse({
      currentPassword: "current-password",
      newPassword: "new-password-123",
      confirmPassword: "different-password",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});
