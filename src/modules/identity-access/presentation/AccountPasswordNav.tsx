"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApiEnvelope } from "../contracts";

const navClassName =
  "inline-flex items-center gap-1 rounded-lg py-1.5 pl-0.5 pr-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300";

export function AccountPasswordNav({ href, exitToLogin = false }: { href?: string; exitToLogin?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleExit() {
    setLoading(true);
    try {
      const response = await fetch("/api/auth", { method: "DELETE" });
      const result = (await response.json()) as ApiEnvelope<null>;
      if (!result.success) return;
      router.push("/admin/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (exitToLogin) {
    return (
      <button type="button" onClick={handleExit} disabled={loading} className={navClassName}>
        <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
        {loading ? "Saliendo…" : "Volver"}
      </button>
    );
  }

  if (!href) return null;

  return (
    <Link href={href} className={navClassName}>
      <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
      Volver
    </Link>
  );
}
