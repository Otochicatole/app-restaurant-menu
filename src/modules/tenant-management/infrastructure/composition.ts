import { createTenantUseCases } from "../application/tenant-use-cases";
import { BcryptPasswordHasher, SecureTemporaryCredentialGenerator } from "./credentials";
import { PrismaTenantAccountRepository } from "./prisma-tenant-account-repository";

export const tenantManagementService = createTenantUseCases({
  repository: new PrismaTenantAccountRepository(),
  passwordHasher: new BcryptPasswordHasher(),
  credentialGenerator: new SecureTemporaryCredentialGenerator(),
});
