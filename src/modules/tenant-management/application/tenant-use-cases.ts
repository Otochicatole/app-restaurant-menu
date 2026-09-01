import { ConflictError, NotFoundError } from "@/platform/application/errors";
import {
  createTenantCommandSchema,
  deleteTenantCommandSchema,
  resetTenantPasswordCommandSchema,
  setTenantStatusCommandSchema,
  tenantSlugSchema,
  updateTenantCommandSchema,
  type ActiveTenant,
  type CreateTenantCommand,
  type CreatedTenant,
  type DeleteTenantCommand,
  type SetTenantStatusCommand,
  type TenantListItem,
  type UpdateTenantCommand,
} from "../contracts";
import { assertTenantSlugAvailableForUse, TenantPolicyViolation } from "../domain/tenant-policy";
import type { PasswordHasher, TemporaryCredentialGenerator, TenantAccountRepository } from "./ports";

type Dependencies = {
  repository: TenantAccountRepository;
  passwordHasher: PasswordHasher;
  credentialGenerator: TemporaryCredentialGenerator;
};

export function createTenantUseCases(dependencies: Dependencies) {
  return {
    async resolveActiveTenant(slugInput: string): Promise<ActiveTenant> {
      const slug = tenantSlugSchema.parse(slugInput);
      const tenant = await dependencies.repository.findActiveBySlug(slug);
      if (!tenant) throw new NotFoundError("Menu");
      return tenant;
    },

    listTenants(): Promise<TenantListItem[]> {
      return dependencies.repository.list();
    },

    async createTenant(input: CreateTenantCommand): Promise<CreatedTenant> {
      const command = createTenantCommandSchema.parse(input);
      try {
        assertTenantSlugAvailableForUse(command.slug);
      } catch (error) {
        if (error instanceof TenantPolicyViolation) throw new ConflictError(error.message);
        throw error;
      }
      const temporaryPassword = dependencies.credentialGenerator.generate();
      const passwordHash = await dependencies.passwordHasher.hash(temporaryPassword);
      const tenant = await dependencies.repository.create({ ...command, passwordHash });
      return { tenant, temporaryPassword };
    },

    updateTenant(input: UpdateTenantCommand): Promise<TenantListItem> {
      return dependencies.repository.update(updateTenantCommandSchema.parse(input));
    },

    setTenantStatus(input: SetTenantStatusCommand): Promise<void> {
      return dependencies.repository.setStatus(setTenantStatusCommandSchema.parse(input));
    },

    async resetTenantPassword(input: { id: string }): Promise<string> {
      const command = resetTenantPasswordCommandSchema.parse(input);
      const temporaryPassword = dependencies.credentialGenerator.generate();
      const passwordHash = await dependencies.passwordHasher.hash(temporaryPassword);
      await dependencies.repository.replacePassword({ id: command.id, passwordHash });
      return temporaryPassword;
    },

    deleteTenant(input: DeleteTenantCommand): Promise<void> {
      return dependencies.repository.delete(deleteTenantCommandSchema.parse(input));
    },
  };
}
