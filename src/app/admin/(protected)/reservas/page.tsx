import { redirect } from "next/navigation";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { reservationManagement } from "@/modules/reservation-management/server";
import { ReservationCmsScreen } from "@/modules/reservation-management/ui";

export default async function AdminReservasPage() {
  const account = await requireTenantAdmin();
  const isEnabled = await reservationManagement.isLandingEnabled(account.tenantId);

  if (!isEnabled) {
    redirect("/admin");
  }

  const cmsData = await reservationManagement.getCmsData(account.tenantId);

  return <ReservationCmsScreen initialData={cmsData} />;
}
