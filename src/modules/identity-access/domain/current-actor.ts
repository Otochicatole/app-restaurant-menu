type ActorBase = {
  adminId: string;
  email: string;
  jti: string;
  mustChangePassword: boolean;
};

export type SuperAdminActor = ActorBase & {
  kind: "super-admin";
  role: "SUPER_ADMIN";
  organizationId: null;
  organizationSlug: null;
};

export type TenantAdminActor = ActorBase & {
  kind: "tenant-admin";
  role: "TENANT_ADMIN";
  organizationId: string;
  organizationSlug: string;
};

export type WaiterActor = ActorBase & {
  kind: "waiter";
  role: "WAITER";
  organizationId: string;
  organizationSlug: string;
  restaurantId: string;
};

export type CurrentActor = SuperAdminActor | TenantAdminActor | WaiterActor;
