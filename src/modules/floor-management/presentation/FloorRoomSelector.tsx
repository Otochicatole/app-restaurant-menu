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

export function FloorSectorSelector({ restaurantId, value, onChange, disabled = false }: { restaurantId: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [rooms, setRooms] = useState<FloorRoom[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    getFloorConfig(restaurantId, controller.signal).then((config) => setRooms(config.rooms.filter((room) => room.active)))
      .catch((failure: Error) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [restaurantId]);
  const options = rooms.flatMap((room) =>
    room.locations.filter((location) => location.active).map((location) => ({
      id: location.id,
      value: `${location.name} · ${room.name}`,
      label: location.maxCapacity != null ? `${location.name} (Cupo ${location.maxCapacity}p)` : location.name,
      roomName: room.name,
    })),
  );
  const hasCurrent = !value || options.some((item) => item.value === value);
  return (
    <div className="space-y-1.5 rounded-xl border border-zinc-200 bg-[#f8faf7] p-3">
      <label className="grid gap-1 text-xs font-medium text-zinc-700">
        Sector preferido
        <select
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-[#3d5934] focus:ring-2 focus:ring-[#3d5934]/15 disabled:opacity-50"
        >
          <option value="">Sin preferencia de sector</option>
          {!hasCurrent && <option value={value}>{value}</option>}
          {rooms.map((room) => {
            const roomOptions = options.filter((item) => item.roomName === room.name);
            if (!roomOptions.length) return null;
            return (
              <optgroup key={room.id} label={room.name}>
                {roomOptions.map((item) => (
                  <option key={item.id} value={item.value}>{item.label}</option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </label>
      <p className="text-xs leading-relaxed text-zinc-600">Solo elegí el sector preferido; la mesa fija se selecciona al confirmar la reserva.</p>
      {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
    </div>
  );
}
