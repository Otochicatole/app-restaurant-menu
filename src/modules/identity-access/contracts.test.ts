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

  it("accepts a new password with 8 characters", () => {
    const result = changePasswordCommandSchema.safeParse({
      currentPassword: "current-password",
      newPassword: "pass1234",
      confirmPassword: "pass1234",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a new password shorter than 8 characters", () => {
    const result = changePasswordCommandSchema.safeParse({
      currentPassword: "current-password",
      newPassword: "pass123",
      confirmPassword: "pass123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["newPassword"]);
      expect(result.error.issues[0]?.message).toBe("La contraseña debe tener al menos 8 caracteres");
    }
  });
});
