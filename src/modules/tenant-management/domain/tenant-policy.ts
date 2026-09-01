const RESERVED_SLUGS = new Set(["_next", "admin", "api", "login", "m", "superadmin"]);

export class TenantPolicyViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantPolicyViolation";
  }
}

export function assertTenantSlugAvailableForUse(slug: string): void {
  if (RESERVED_SLUGS.has(slug)) {
    throw new TenantPolicyViolation("Ese slug está reservado.");
  }
}
