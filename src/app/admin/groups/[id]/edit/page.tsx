import { getGroupById, updateGroup } from "@/features/groups/backend/services/group.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import { GroupForm } from "@/features/groups/frontend/components/GroupForm";
import { notFound } from "next/navigation";

interface EditGroupPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGroupPage({ params }: EditGroupPageProps) {
  const { id } = await params;
  const group = await getGroupById(id).catch(() => null);

  if (!group) notFound();

  async function handleSubmit(data: { name: string; description: string }) {
    "use server";
    try {
      await ensureAdmin();
      const updated = await updateGroup(id, data);
      return { success: true, data: updated };
    } catch (e) {
      return { success: false, error: { message: e instanceof Error ? e.message : "Failed to update group" } };
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-zinc-900">Edit Group</h1>
      <div className="mt-6 max-w-lg bg-white rounded-lg border border-zinc-200 p-6">
        <GroupForm
          initialData={{ name: group.name, description: group.description }}
          onSubmit={handleSubmit}
          submitLabel="Update Group"
        />
      </div>
    </AdminLayout>
  );
}
