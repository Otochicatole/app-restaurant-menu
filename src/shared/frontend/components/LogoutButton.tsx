"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  return (
    <button onClick={handleLogout} className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-emerald-100 transition hover:bg-emerald-900 hover:text-white">
      Logout
    </button>
  );
}
