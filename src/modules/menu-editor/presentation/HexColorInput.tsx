"use client";

import { useId, useState } from "react";

const HEX_COLOR = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

export function HexColorInput({ label, value, disabled = false, allowAlpha = true, onChange }: { label: string; value: string; disabled?: boolean; allowAlpha?: boolean; onChange: (value: string) => void }) {
  const [editing, setEditing] = useState({ source: value, draft: value });
  const hintId = useId();
  const draft = editing.source === value ? editing.draft : value;
  const valid = isValidHexColor(draft, allowAlpha);

  const update = (next: string) => {
    const nextValid = isValidHexColor(next, allowAlpha);
    setEditing({ source: nextValid ? next : value, draft: next });
    if (nextValid) onChange(next);
  };

  return <div className="min-w-0 flex-1">
    <input
      aria-label={`Código HEX de ${label.toLowerCase()}`}
      aria-invalid={!valid}
      aria-describedby={!valid ? hintId : undefined}
      disabled={disabled}
      className={`w-full rounded-md border bg-white px-2.5 py-2 font-mono text-xs outline-none transition focus:ring-2 disabled:bg-zinc-100 disabled:text-zinc-400 ${valid ? "border-zinc-300 focus:border-emerald-600 focus:ring-emerald-100" : "border-red-400 text-red-700 focus:border-red-500 focus:ring-red-100"}`}
      type="text"
      inputMode="text"
      autoCapitalize="characters"
      autoCorrect="off"
      spellCheck={false}
      maxLength={allowAlpha ? 9 : 7}
      placeholder="#0459c8"
      value={draft}
      onChange={(event) => update(event.target.value.trim())}
      onBlur={() => { if (!valid) setEditing({ source: value, draft: value }); }}
      onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
    />
    {!valid && <p id={hintId} className="mt-1 text-[11px] text-red-600">Usá el formato #RRGGBB{allowAlpha ? " o #RRGGBBAA" : ""}.</p>}
  </div>;
}

export function isValidHexColor(value: string, allowAlpha = true): boolean {
  return HEX_COLOR.test(value) && (allowAlpha || value.length === 7);
}
