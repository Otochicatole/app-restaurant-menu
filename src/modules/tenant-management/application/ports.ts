import type {
  ActiveTenant,
  CreateTenantCommand,
  DeleteTenantCommand,
  SetTenantStatusCommand,
  TenantListItem,
  UpdateTenantCommand,
} from "../contracts";

export interface TenantAccountRepository {
  findActiveBySlug(slug: string): Promise<ActiveTenant | null>;
  list(): Promise<TenantListItem[]>;
  create(input: CreateTenantCommand & { passwordHash: string }): Promise<TenantListItem>;
  update(input: UpdateTenantCommand): Promise<TenantListItem>;
  setStatus(input: SetTenantStatusCommand): Promise<void>;
  replacePassword(input: { id: string; passwordHash: string }): Promise<void>;
  delete(input: DeleteTenantCommand): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
}

export interface TemporaryCredentialGenerator {
  generate(): string;
}
