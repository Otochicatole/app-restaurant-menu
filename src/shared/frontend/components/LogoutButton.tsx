"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  return (
    <button onClick={handleLogout} className="text-sm text-zinc-600 hover:text-zinc-900">
      Logout
    </button>
  );
}
