import { getGroups } from "@/features/groups/backend/services/group.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import Link from "next/link";
import { GroupListClient } from "./GroupListClient";

export default async function AdminGroupsPage() {
  const groups = await getGroups();

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Groups</h1>
        <Link
          href="/admin/groups/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New Group
        </Link>
      </div>
      <div className="mt-6">
        <GroupListClient groups={groups} />
      </div>
    </AdminLayout>
  );
}
