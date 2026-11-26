"use client";

import { useState } from "react";

type SuperadminTemplatesTabsProps = {
  menuCount: number;
  menuPending: number;
  landingCount: number;
  landingPending: number;
  menuPanel: React.ReactNode;
  landingPanel: React.ReactNode;
};

export function SuperadminTemplatesTabs({
  menuCount,
  menuPending,
  landingCount,
  landingPending,
  menuPanel,
  landingPanel,
}: SuperadminTemplatesTabsProps) {
  const [tab, setTab] = useState<"menu" | "landing">("menu");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Biblioteca de plantillas
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Moderá envíos de la comunidad y administrá los presets del sistema para Menú y Landing.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Tipo de plantillas"
          className="inline-flex rounded-lg border border-stone-200 bg-white p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "menu"}
            onClick={() => setTab("menu")}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === "menu"
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <span>Plantillas de Menú</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                tab === "menu" ? "bg-white/20 text-white" : "bg-stone-100 text-stone-700"
              }`}
            >
              {menuCount}
            </span>
            {menuPending > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-amber-800">
                {menuPending} pend.
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === "landing"}
            onClick={() => setTab("landing")}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === "landing"
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <span>Plantillas de Landing</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                tab === "landing" ? "bg-white/20 text-white" : "bg-stone-100 text-stone-700"
              }`}
            >
              {landingCount}
            </span>
            {landingPending > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-amber-800">
                {landingPending} pend.
              </span>
            )}
          </button>
        </div>
      </div>

      {tab === "menu" ? menuPanel : landingPanel}
    </div>
  );
}
