import { ConflictError } from "@/platform/application/errors";
import { createOrganizationSchema, updateOrganizationSchema, type CreateOrganizationCommand, type OrganizationListItem, type UpdateOrganizationCommand } from "../contracts";

export interface OrganizationRepository {
  list(): Promise<OrganizationListItem[]>;
  create(command: CreateOrganizationCommand & { passwordHash: string }): Promise<OrganizationListItem>;
  update(command: UpdateOrganizationCommand): Promise<OrganizationListItem>;
  setStatus(id: string, status: "ACTIVE" | "SUSPENDED"): Promise<void>;
  replacePassword(id: string, passwordHash: string): Promise<void>;
  delete(id: string, confirmationSlug: string): Promise<void>;
}
export function assertRestaurantLimit(maxRestaurants: number, currentCount: number) {
  if (maxRestaurants < currentCount) throw new ConflictError(`La organización tiene ${currentCount} restaurantes. Eliminá los que correspondan antes de reducir el cupo.`);
}
export function createOrganizationUseCases(dependencies: {
  repository: OrganizationRepository; hashPassword: (password: string) => Promise<string>; generatePassword: () => string;
}) {
  return {
    listOrganizations: () => dependencies.repository.list(),
    async createOrganization(input: CreateOrganizationCommand) {
      const command = createOrganizationSchema.parse(input);
      const temporaryPassword = dependencies.generatePassword();
      const organization = await dependencies.repository.create({ ...command, passwordHash: await dependencies.hashPassword(temporaryPassword) });
      return { organization, temporaryPassword };
    },
    updateOrganization: (input: UpdateOrganizationCommand) => dependencies.repository.update(updateOrganizationSchema.parse(input)),
    setOrganizationStatus: (id: string, status: "ACTIVE" | "SUSPENDED") => dependencies.repository.setStatus(id, status),
    async resetOrganizationPassword(id: string) {
      const temporaryPassword = dependencies.generatePassword();
      await dependencies.repository.replacePassword(id, await dependencies.hashPassword(temporaryPassword));
      return temporaryPassword;
    },
    deleteOrganization: (id: string, confirmationSlug: string) => dependencies.repository.delete(id, confirmationSlug),
  };
}
