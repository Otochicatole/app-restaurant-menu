type ActorBase = {
  adminId: string;
  email: string;
  jti: string;
  mustChangePassword: boolean;
};

export type SuperAdminActor = ActorBase & {
  kind: "super-admin";
  role: "SUPER_ADMIN";
  tenantId: null;
  tenantSlug: null;
};

export type TenantAdminActor = ActorBase & {
  kind: "tenant-admin";
  role: "TENANT_ADMIN";
  tenantId: string;
  tenantSlug: string;
};

export type CurrentActor = SuperAdminActor | TenantAdminActor;
