import type { TenantStatus } from "../contracts";

export type TenantStatusFilter = "ALL" | TenantStatus;

type SearchableTenant = {
  name: string;
  email: string;
  slug: string;
  status: TenantStatus;
};

export function normalizeTenantSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-AR")
    .trim();
}

export function filterTenantRows<T extends SearchableTenant>(
  tenants: T[],
  query: string,
  statusFilter: TenantStatusFilter,
): T[] {
  const normalizedQuery = normalizeTenantSearch(query);

  return tenants.filter((tenant) => {
    if (statusFilter !== "ALL" && tenant.status !== statusFilter) return false;
    if (!normalizedQuery) return true;

    return [tenant.name, tenant.email, tenant.slug].some((value) =>
      normalizeTenantSearch(value).includes(normalizedQuery),
    );
  });
}

