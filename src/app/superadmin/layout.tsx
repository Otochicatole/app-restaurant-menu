import { requireSuperAdmin } from "@/modules/identity-access/server";
import { SuperadminNav } from "./SuperadminNav";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireSuperAdmin();
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 lg:pl-64">
      <SuperadminNav accountEmail={actor.email} />
      <div className="min-h-screen">{children}</div>
    </div>
  );
}
