import { createHash } from "node:crypto";
import type { ManagedReservationRuntimeCompatibility } from "../contracts";
import { BUILTIN_LANDING_MODULES } from "./landing-module-catalog";

// These fingerprints are frozen for runtimes already embedded in published landings.
const legacyRuntimes: Record<string, { length: number; sha256: string }[]> = {
  "reservations-table": [
    { length: 33758, sha256: "07d0f05ed8573d5f8eaeb142a4452624587b38c6c07c5199ff31d11f1789b2e1" },
    { length: 35099, sha256: "d545317ec5606b7f1072735e13c68a6f9efd2b9d3f05a7b333eac7d62ce3120e" },
  ],
  "reservations-booking": [
    { length: 38681, sha256: "0e83c97d442a3c1af2503fd0f7843de9d1b6c18822ec00396fec823aad52e5ad" },
    { length: 40992, sha256: "02cbf722bd9a7df0d6248ea6fb3482e9a430446eb692a7803c301397796139d9" },
  ],
  "reservations-events": [
    { length: 13008, sha256: "ddabe754943d1447db506887670a48353cea975864b4c1b2c841d7f2868a0d38" },
    { length: 13035, sha256: "feb385dd3b26f9337a60752c0dfbf3fd24584b42b9e40602cd475af9c101be91" },
  ],
};
const generatedStart = "(function() {\n  function __initModuleScripts() {\n";
const generatedEnd = "\n  }\n  window.__initLandingModuleScripts = __initModuleScripts;\n  if (document.readyState === 'loading') {\n    document.addEventListener('DOMContentLoaded', __initModuleScripts);\n  } else {\n    __initModuleScripts();\n  }\n})();";
const byKey = new Map(BUILTIN_LANDING_MODULES.map((definition) => [definition.moduleKey, definition]));

function decodeAttribute(value: string): string {
  return value.replaceAll("&quot;", '"').replaceAll("&#039;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

function normalizedScript(value: string): string {
  return value.replaceAll("\r\n", "\n").replace(/<\/script/gi, "<\\/script");
}

function normalizeWithOffsets(value: string) {
  let normalized = "";
  const offsets: number[] = [];
  for (let index = 0; index < value.length; index++) {
    if (value[index] === "\r" && value[index + 1] === "\n") continue;
    offsets.push(index);
    normalized += value[index];
  }
  offsets.push(value.length);
  return { normalized, offsets };
}

/** Adapt only a fully verified compiler prefix; publication and custom suffix stay intact. */
export function upgradePublishedReservationRuntime(html: string): {
  html: string;
  compatibility: ManagedReservationRuntimeCompatibility;
} {
  const blocks = [...html.matchAll(/<div\b[^>]*\bdata-landing-block="[^"]*"[^>]*>/g)].map((match) => ({
    key: /\bdata-module-key="([^"]*)"/.exec(match[0])?.[1] ?? "",
    label: decodeAttribute(/\bdata-block-label="([^"]*)"/.exec(match[0])?.[1] ?? ""),
  }));
  const hasManagedReservations = blocks.some((block) => block.key in legacyRuntimes);
  const manual = (reason: string) => ({
    html,
    compatibility: { status: "manual-update-required" as const, hasManagedReservations, reason },
  });
  if (!hasManagedReservations) {
    if (/\/reservations\/(?:tables|availability)|resTableForm|resBookingForm/.test(html)) {
      return manual("La integración de reservas es personalizada; actualizá sus consultas de disponibilidad para enviar la cantidad de personas.");
    }
    return { html, compatibility: { status: "compatible", hasManagedReservations: false } };
  }
  if (blocks.some((block) => !byKey.has(block.key))) {
    return manual("La publicación contiene módulos personalizados y no se puede verificar su código administrado automáticamente.");
  }
  const scripts = [...html.matchAll(/<script\b[^>]*\bid=["']custom-landing-js["'][^>]*>([\s\S]*?)<\/script\s*>/gi)];
  if (scripts.length !== 1) return manual("La publicación no tiene un único bloque de JavaScript administrado reconocible.");
  const script = scripts[0]!;
  const source = script[1]!;
  const { normalized, offsets } = normalizeWithOffsets(source);
  let cursor = normalized.startsWith("\n") ? 1 : 0;
  const consume = (expected: string) => {
    if (!normalized.startsWith(expected, cursor)) return false;
    cursor += expected.length;
    return true;
  };
  if (!consume(generatedStart)) return manual("El JavaScript publicado fue personalizado; no se reemplazó ningún código.");
  const replacements: { start: number; end: number; value: string }[] = [];
  let hasPreviousScript = false;
  for (const block of blocks) {
    const definition = byKey.get(block.key)!;
    const current = normalizedScript(definition.jsTemplate.trim());
    if (!current) continue;
    if (hasPreviousScript && !consume("\n\n")) return manual("La estructura del JavaScript publicado no coincide con el compilador.");
    hasPreviousScript = true;
    if (!consume(`// Módulo: ${block.label}\n(function() {\n`)) return manual("Un módulo publicado contiene código personalizado.");
    if (normalized.startsWith(current, cursor)) {
      cursor += current.length;
    } else {
      const legacy = legacyRuntimes[block.key]?.find(({ length, sha256 }) =>
        createHash("sha256").update(normalized.slice(cursor, cursor + length)).digest("hex") === sha256,
      );
      if (!legacy) {
        return manual("Un módulo publicado contiene código personalizado o una versión no reconocida.");
      }
      replacements.push({ start: offsets[cursor]!, end: offsets[cursor + legacy.length]!, value: current });
      cursor += legacy.length;
    }
    if (!consume("\n})();")) return manual("El cierre de un módulo publicado no coincide con el compilador.");
  }
  if (!consume(generatedEnd) || (cursor < normalized.length && !normalized.startsWith("\n", cursor))) {
    return manual("El cierre del código administrado publicado no coincide con el compilador.");
  }
  let updated = source;
  for (const replacement of replacements.reverse()) {
    updated = updated.slice(0, replacement.start) + replacement.value + updated.slice(replacement.end);
  }
  const bodyStart = script.index! + script[0].indexOf(">") + 1;
  return {
    html: replacements.length ? html.slice(0, bodyStart) + updated + html.slice(bodyStart + source.length) : html,
    compatibility: { status: "compatible", hasManagedReservations: true },
  };
}

export function inspectPublishedReservationRuntime(html: string): ManagedReservationRuntimeCompatibility {
  return upgradePublishedReservationRuntime(html).compatibility;
}
