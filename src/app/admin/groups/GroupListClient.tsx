"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GroupDTO } from "@/features/groups/frontend/types";

interface GroupListClientProps {
  groups: GroupDTO[];
}

export function GroupListClient({ groups }: GroupListClientProps) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  };

  if (groups.length === 0) {
    return <p className="text-zinc-500">No groups yet.</p>;
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="px-4 py-3 text-left font-medium text-zinc-600">Name</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600">Products</th>
            <th className="px-4 py-3 text-right font-medium text-zinc-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.id} className="border-b border-zinc-100">
              <td className="px-4 py-3 text-zinc-900">{group.name}</td>
              <td className="px-4 py-3 text-zinc-600">{group.productCount ?? 0}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/groups/${group.id}/edit`}
                  className="text-sm text-zinc-600 hover:text-zinc-900 mr-3"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(group.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
