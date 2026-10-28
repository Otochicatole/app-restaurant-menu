import { describe, expect, it, vi } from "vitest";
import { assertRestaurantLimit, createOrganizationUseCases, type OrganizationRepository } from "./organization-use-cases";

function setup() {
  const repository = { list: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "o1" }), update: vi.fn().mockResolvedValue({ id: "o1" }), setStatus: vi.fn().mockResolvedValue(undefined), replacePassword: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(undefined) } satisfies OrganizationRepository;
  const hashPassword = vi.fn().mockResolvedValue("hashed");
  return { repository, hashPassword, service: createOrganizationUseCases({ repository, hashPassword, generatePassword: () => "temporary-password" }) };
}
describe("organization management", () => {
  it("rejects a limit below existing restaurants instead of deleting them", () => {
    expect(() => assertRestaurantLimit(1, 2)).toThrow("antes de reducir");
    expect(() => assertRestaurantLimit(2, 2)).not.toThrow();
  });
  it("creates an organization and initial restaurant with normalized credentials", async () => {
    const { service, repository, hashPassword } = setup();
    const result = await service.createOrganization({ name: "Grupo", email: "ADMIN@example.com", slug: "centro", restaurantName: "Centro" });
    expect(result.temporaryPassword).toBe("temporary-password");
    expect(hashPassword).toHaveBeenCalledWith("temporary-password");
    expect(repository.create).toHaveBeenCalledWith({ name: "Grupo", email: "admin@example.com", slug: "centro", restaurantName: "Centro", passwordHash: "hashed" });
  });
  it("validates account updates and leaves restaurant identities independent", async () => {
    const { service, repository } = setup();
    await service.updateOrganization({ id: "o1", name: "Grupo nuevo", email: "nuevo@example.com", maxRestaurants: 3 });
    expect(repository.update).toHaveBeenCalledWith({ id: "o1", name: "Grupo nuevo", email: "nuevo@example.com", maxRestaurants: 3 });
    expect(() => service.updateOrganization({ id: "o1", name: "", email: "bad", maxRestaurants: 0 })).toThrow();
  });
  it("lists organizations, changes status, resets passwords and deletes with explicit confirmation", async () => {
    const { service, repository } = setup();
    await service.listOrganizations(); await service.setOrganizationStatus("o1", "SUSPENDED");
    expect(await service.resetOrganizationPassword("o1")).toBe("temporary-password");
    await service.deleteOrganization("o1", "centro");
    expect(repository.list).toHaveBeenCalled(); expect(repository.setStatus).toHaveBeenCalledWith("o1", "SUSPENDED");
    expect(repository.replacePassword).toHaveBeenCalledWith("o1", "hashed"); expect(repository.delete).toHaveBeenCalledWith("o1", "centro");
  });
});
