import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitedError,
  UnauthorizedError,
} from "@/platform/application/errors";
import { handleApiError } from "./api-response";

describe("HTTP error mapping", () => {
  it.each([
    [new SyntaxError("bad json"), 400, "BAD_REQUEST"],
    [new ConflictError("duplicate"), 409, "CONFLICT"],
    [new UnauthorizedError(), 401, "UNAUTHORIZED"],
    [new ForbiddenError(), 403, "FORBIDDEN"],
    [new NotFoundError("Product"), 404, "NOT_FOUND"],
  ])("maps an application failure to its stable envelope", async (error, status, code) => {
    const response = handleApiError(error);
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ success: false, error: { code } });
  });

  it("maps schema errors to 422 and throttle errors to Retry-After", async () => {
    const parsed = z.object({ id: z.string().min(1) }).safeParse({ id: "" });
    if (parsed.success) throw new Error("expected invalid fixture");
    expect(handleApiError(parsed.error).status).toBe(422);
    const throttled = handleApiError(new RateLimitedError(37));
    expect(throttled.status).toBe(429);
    expect(throttled.headers.get("retry-after")).toBe("37");
  });

  it("never exposes unexpected error details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = handleApiError(new Error("postgres://secret"));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
    log.mockRestore();
  });
});
