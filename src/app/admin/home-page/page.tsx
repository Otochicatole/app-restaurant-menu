import { getOrCreateHomePage, updateHomePage } from "@/features/home-page/backend/services/home-page.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import { HomePageForm } from "@/features/home-page/frontend/components/HomePageForm";

export default async function AdminHomePage() {
  const homePage = await getOrCreateHomePage();

  async function handleSubmit(data: { title: string; description: string }) {
    "use server";
    try {
      await ensureAdmin();
      const updated = await updateHomePage(data);
      return { success: true, data: updated };
    } catch (e) {
      return { success: false, error: { message: e instanceof Error ? e.message : "Failed to update" } };
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-zinc-900">Home Page</h1>
      <p className="mt-1 text-sm text-zinc-500">Edit the title and description shown on the homepage.</p>
      <div className="mt-6 max-w-lg bg-white rounded-lg border border-zinc-200 p-6">
        <HomePageForm
          initialData={{ title: homePage.title, description: homePage.description }}
          onSubmit={handleSubmit}
          submitLabel="Update Home Page"
        />
      </div>
    </AdminLayout>
  );
}
