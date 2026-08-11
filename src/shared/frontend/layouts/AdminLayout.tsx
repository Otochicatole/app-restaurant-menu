import { getOrCreateHomePage } from "@/features/home-page/backend/services/home-page.service";
import { AdminShell } from "./AdminShell";

export async function AdminLayout({ children }: { children: React.ReactNode }) {
  const homePage = await getOrCreateHomePage();

  return (
    <AdminShell brandTitle={homePage.title} brandSubtitle={homePage.description}>
      {children}
    </AdminShell>
  );
}
