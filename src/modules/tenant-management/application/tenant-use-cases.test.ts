import { describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "@/platform/application/errors";
import { createTenantUseCases } from "./tenant-use-cases";
import type { TenantAccountRepository } from "./ports";

function createRepository(): TenantAccountRepository {
  return {
    findActiveBySlug: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation(async (input) => ({
      id: "tenant-1",
      name: input.name,
      slug: input.slug,
      status: "ACTIVE",
      email: input.email,
      lastLoginAt: null,
      createdAt: new Date(0).toISOString(),
    })),
    update: vi.fn(),
    setStatus: vi.fn(),
    replacePassword: vi.fn(),
    delete: vi.fn(),
  };
}

describe("tenant management use cases", () => {
  it("normalizes input and creates a tenant with a generated hashed credential", async () => {
    const repository = createRepository();
    const useCases = createTenantUseCases({
      repository,
      credentialGenerator: { generate: () => "temporary-secret" },
      passwordHasher: { hash: vi.fn().mockResolvedValue("hashed-secret") },
    });

    const result = await useCases.createTenant({
      name: "  Café Central  ",
      email: "ADMIN@CENTRAL.TEST",
      slug: "Cafe-Central",
    });

    expect(result.temporaryPassword).toBe("temporary-secret");
    expect(repository.create).toHaveBeenCalledWith({
      name: "Café Central",
      email: "admin@central.test",
      slug: "cafe-central",
      passwordHash: "hashed-secret",
    });
  });

  it("rejects reserved public slugs", async () => {
    const useCases = createTenantUseCases({
      repository: createRepository(),
      credentialGenerator: { generate: () => "temporary-secret" },
      passwordHasher: { hash: vi.fn().mockResolvedValue("hashed-secret") },
    });

    await expect(
      useCases.createTenant({ name: "Admin", email: "admin@example.test", slug: "admin" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("does not resolve missing or suspended menus", async () => {
    const useCases = createTenantUseCases({
      repository: createRepository(),
      credentialGenerator: { generate: () => "temporary-secret" },
      passwordHasher: { hash: vi.fn().mockResolvedValue("hashed-secret") },
    });

    await expect(useCases.resolveActiveTenant("missing-menu")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("delegates the complete tenant lifecycle through validated commands", async () => {
    const repository = createRepository();
    const row = {
      id: "tenant-1",
      name: "Café",
      slug: "cafe-central",
      status: "ACTIVE" as const,
      email: "admin@cafe.test",
      lastLoginAt: null,
      createdAt: new Date(0).toISOString(),
    };
    vi.mocked(repository.findActiveBySlug).mockResolvedValue({ id: row.id, name: row.name, slug: row.slug, status: "ACTIVE" });
    vi.mocked(repository.list).mockResolvedValue([row]);
    vi.mocked(repository.update).mockResolvedValue({ ...row, name: "Nuevo nombre" });
    const hash = vi.fn(async (password: string) => `hashed:${password}`);
    const useCases = createTenantUseCases({
      repository,
      credentialGenerator: { generate: () => "temporary-secret" },
      passwordHasher: { hash },
    });

    await expect(useCases.resolveActiveTenant(" CAFE-CENTRAL ")).resolves.toMatchObject({ id: "tenant-1" });
    await expect(useCases.listTenants()).resolves.toEqual([row]);
    await expect(useCases.updateTenant({ id: "tenant-1", name: " Nuevo nombre ", email: "NEW@CAFE.TEST" })).resolves.toMatchObject({ name: "Nuevo nombre" });
    await useCases.setTenantStatus({ id: "tenant-1", status: "SUSPENDED" });
    await expect(useCases.resetTenantPassword({ id: "tenant-1" })).resolves.toBe("temporary-secret");
    await useCases.deleteTenant({ id: "tenant-1", confirmationSlug: "cafe-central" });

    expect(repository.findActiveBySlug).toHaveBeenCalledWith("cafe-central");
    expect(repository.update).toHaveBeenCalledWith({ id: "tenant-1", name: "Nuevo nombre", email: "new@cafe.test" });
    expect(repository.replacePassword).toHaveBeenCalledWith({ id: "tenant-1", passwordHash: "hashed:temporary-secret" });
    expect(repository.delete).toHaveBeenCalledWith({ id: "tenant-1", confirmationSlug: "cafe-central" });
  });

  it("rejects malformed lifecycle commands before repository mutation", async () => {
    const repository = createRepository();
    const useCases = createTenantUseCases({
      repository,
      credentialGenerator: { generate: () => "temporary-secret" },
      passwordHasher: { hash: vi.fn(async () => "hash") },
    });
    expect(() => useCases.updateTenant({ id: "", name: "", email: "invalid" })).toThrow();
    expect(() => useCases.setTenantStatus({ id: "", status: "ACTIVE" })).toThrow();
    await expect(useCases.resetTenantPassword({ id: "" })).rejects.toBeDefined();
    expect(() => useCases.deleteTenant({ id: "", confirmationSlug: "admin" })).toThrow();
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.setStatus).not.toHaveBeenCalled();
    expect(repository.replacePassword).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
