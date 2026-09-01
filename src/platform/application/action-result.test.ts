import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ConflictError } from "./errors";
import { actionErrorResult, actionSuccess } from "./action-result";

describe("ActionResult", () => {
  it("uses one success and validation envelope for every server action", () => {
    expect(actionSuccess({ id: "one" })).toEqual({ success: true, data: { id: "one" } });
    const validation = z.object({ name: z.string().min(1) }).safeParse({ name: "" });
    if (validation.success) throw new Error("expected invalid fixture");
    expect(actionErrorResult(validation.error, "fallback")).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR", fieldErrors: { name: expect.any(Array) } },
    });
  });

  it("maps application errors and hides unexpected details", () => {
    expect(actionErrorResult(new ConflictError("duplicado"), "fallback")).toEqual({
      success: false,
      error: { code: "CONFLICT", message: "duplicado" },
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(actionErrorResult(new Error("database password leaked"), "No se pudo completar")).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudo completar" },
    });
    log.mockRestore();
  });
});
