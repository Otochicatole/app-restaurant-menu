"use client";

import { transientButtonProps } from "@/ui/button-state";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApiEnvelope } from "../contracts";

export function LogoutButton({ compact = false, sidebar = false, floating = false, disabled = false, onBeforeLogout }: { compact?: boolean; sidebar?: boolean; floating?: boolean; disabled?: boolean; onBeforeLogout?: (proceed: () => Promise<void>) => void }) {
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
  const requestLogout = () => { if (onBeforeLogout) onBeforeLogout(handleLogout); else void handleLogout(); };

  if (floating) {
    return <div className="relative shrink-0"><button {...transientButtonProps} type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={requestLogout} disabled={disabled || loading} className="flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-[#263e23] shadow-[0_3px_16px_rgba(24,38,24,0.12)] transition-colors hover:bg-[#edf2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d5934] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:px-3"><LogOut size={18} className="shrink-0" /><span className="hidden whitespace-nowrap lg:inline">{loading ? "Cerrando…" : "Cerrar sesión"}</span></button><p role={error ? "alert" : undefined} aria-live="polite" className={error ? "absolute bottom-full right-0 mb-3 w-64 rounded-lg bg-red-50 p-3 text-xs leading-relaxed text-red-800" : "sr-only"}>{error ?? ""}</p></div>;
  }

  if (sidebar) {
    return (
      <div className="w-72">
        <button {...transientButtonProps}
          type="button"
          onClick={requestLogout}
          disabled={disabled || loading}
          className="group grid h-11 w-72 grid-cols-[4rem_1fr] items-center whitespace-nowrap text-left text-sm font-medium text-zinc-500 disabled:opacity-60"
          title={compact ? "Cerrar sesión" : undefined}
        >
          <span className="flex h-full items-center justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors group-hover:bg-zinc-100 group-hover:text-[#182618]">
              <LogOut size={16} />
            </span>
          </span>
          <span className={`min-w-[180px] whitespace-nowrap pr-4 transition-opacity duration-150 ease-out group-hover:text-[#182618] ${compact ? "opacity-100 lg:pointer-events-none lg:opacity-0" : "opacity-100 delay-100"}`}>
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
      <button {...transientButtonProps}
        type="button"
        onClick={requestLogout}
        disabled={disabled || loading}
        className={`flex items-center rounded-xl text-zinc-500 transition-colors disabled:opacity-60 ${compact ? "h-10 w-10 justify-center hover:bg-red-50 hover:text-red-700 active:scale-95" : "w-full gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-zinc-100 hover:text-[#182618]"}`}
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
