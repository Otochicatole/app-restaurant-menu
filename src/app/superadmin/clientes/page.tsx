import { createOrganizationAction, deleteOrganizationAction, organizationManagement, resetOrganizationPasswordAction, setOrganizationStatusAction, updateOrganizationAction, updateRestaurantOptionsAction } from "@/modules/organization-management/server";
import { OrganizationManager } from "@/modules/organization-management/ui";

export default async function SuperAdminClientsPage() {
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10"><OrganizationManager organizations={await organizationManagement.listOrganizations()} actions={{ create: createOrganizationAction, update: updateOrganizationAction, status: setOrganizationStatusAction, resetPassword: resetOrganizationPasswordAction, remove: deleteOrganizationAction, restaurantOptions: updateRestaurantOptionsAction }} /></main>;
}