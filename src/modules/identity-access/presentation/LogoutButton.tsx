"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApiEnvelope } from "../contracts";

export function LogoutButton({ compact = false, sidebar = false }: { compact?: boolean; sidebar?: boolean }) {
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

  if (sidebar) {
    return (
      <div className="w-72">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loading}
          className="group grid h-11 w-72 grid-cols-[4rem_1fr] items-center whitespace-nowrap text-left text-sm font-medium text-zinc-500 disabled:opacity-60"
          title={compact ? "Cerrar sesión" : undefined}
        >
          <span className="flex h-full items-center justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors group-hover:bg-zinc-100 group-hover:text-emerald-950">
              <LogOut size={16} />
            </span>
          </span>
          <span className={`min-w-[180px] whitespace-nowrap pr-4 transition-opacity duration-150 ease-out group-hover:text-emerald-950 ${compact ? "opacity-100 lg:pointer-events-none lg:opacity-0" : "opacity-100 delay-100"}`}>
            {loading ? "Cerrando..." : "Cerrar sesión"}
          </span>
        </button>
        <p aria-live="polite" className={error ? "ml-16 mt-1 px-1 text-xs text-red-600" : "sr-only"}>
          {error ?? ""}
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-emerald-950 disabled:opacity-60 ${compact ? "justify-center px-0" : ""}`}
        title={compact ? "Cerrar sesión" : undefined}
      >
        <LogOut size={16} />
        {!compact && (loading ? "Cerrando..." : "Cerrar sesión")}
      </button>
      <p aria-live="polite" className={error ? "mt-2 px-3 text-xs text-red-600" : "sr-only"}>
        {error ?? ""}
      </p>
    </div>
  );
}
