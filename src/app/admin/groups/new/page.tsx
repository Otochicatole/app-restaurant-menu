import { createGroup } from "@/features/groups/backend/services/group.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import { GroupForm } from "@/features/groups/frontend/components/GroupForm";

export default function NewGroupPage() {
  async function handleSubmit(data: { name: string; description: string }) {
    "use server";
    try {
      await ensureAdmin();
      const group = await createGroup(data);
      return { success: true, data: group };
    } catch (e) {
      return { success: false, error: { message: e instanceof Error ? e.message : "Failed to create group" } };
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-zinc-900">New Group</h1>
      <div className="mt-6 max-w-lg bg-white rounded-lg border border-zinc-200 p-6">
        <GroupForm onSubmit={handleSubmit} submitLabel="Create Group" />
      </div>
    </AdminLayout>
  );
}
