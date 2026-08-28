"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApiEnvelope } from "../contracts";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth", { method: "DELETE" });
      const result = (await response.json()) as ApiEnvelope<null>;
      if (!result.success) {
        setError(result.error.message || "No se pudo cerrar la sesión");
        return;
      }
      router.push("/admin/login");
      router.refresh();
    } catch {
      setError("No se pudo cerrar la sesión. Volvé a intentarlo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-emerald-100 transition hover:bg-emerald-900 hover:text-white disabled:opacity-60"
      >
        <LogOut size={16} />
        {loading ? "Cerrando..." : "Cerrar sesión"}
      </button>
      <p aria-live="polite" className={error ? "mt-2 px-3 text-xs text-red-200" : "sr-only"}>
        {error ?? ""}
      </p>
    </div>
  );
}
