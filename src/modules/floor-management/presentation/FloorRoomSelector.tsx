"use client";

import { useEffect, useState } from "react";
import type { FloorRoom } from "../contracts";
import { getFloorConfig } from "./floor-api";

export function FloorRoomSelector({ restaurantId, value, onChange }: { restaurantId: string; value: string[]; onChange: (value: string[]) => void }) {
  const [rooms, setRooms] = useState<FloorRoom[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    getFloorConfig(restaurantId, controller.signal).then((config) => setRooms(config.rooms.filter((room) => room.active)))
      .catch((failure: Error) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [restaurantId]);
  return <fieldset className="space-y-2 rounded-lg border border-zinc-200 p-3"><legend className="px-1 text-xs font-semibold text-zinc-700">Salones del evento</legend><p className="text-xs leading-relaxed text-zinc-600">Las reservas del evento se asignan dentro de estos salones. El bloqueo exclusivo afecta solamente a los seleccionados.</p>{error && <p role="alert" className="text-xs text-red-800">{error}</p>}<div className="flex flex-wrap gap-3">{rooms.map((room) => <label key={room.id} className="flex items-center gap-2 text-sm text-zinc-800"><input type="checkbox" checked={value.includes(room.id)} onChange={(event) => onChange(event.target.checked ? [...value, room.id] : value.filter((id) => id !== room.id))} />{room.name}</label>)}</div>{!rooms.length && !error && <p className="text-xs text-zinc-600">No hay salones activos. Configurá un salón antes de publicar el evento.</p>}</fieldset>;
}
