import type {
  ActiveTenant,
  CreateTenantCommand,
  DeleteTenantCommand,
  DeleteTenantMenusCommand,
  SetTenantLandingCommand,
  SetTenantMaxMenusCommand,
  SetTenantMultiMenuCommand,
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
  setMultiMenuEnabled(input: SetTenantMultiMenuCommand): Promise<void>;
  setMaxMenus(input: SetTenantMaxMenusCommand): Promise<void>;
  setLandingEnabled(input: SetTenantLandingCommand): Promise<void>;
  deleteMenus(input: DeleteTenantMenusCommand): Promise<{ deletedIds: string[] }>;
  replacePassword(input: { id: string; passwordHash: string }): Promise<void>;
  delete(input: DeleteTenantCommand): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
}

export interface TemporaryCredentialGenerator {
  generate(): string;
}
