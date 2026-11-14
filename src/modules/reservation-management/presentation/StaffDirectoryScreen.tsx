import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Pencil, Plus, Power, Search, UserCheck, Users } from "lucide-react";
import { AdminCard, AdminPageHeader, adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { AdminModal } from "@/ui/admin/AdminUI";
import { staffRoleLabels, staffRoleSchema, type StaffMemberView, type StaffRole } from "../contracts";
import { ServiceLoadError, ServiceLoading, serviceInputClass } from "./ServiceAdminUi";
import { sendServiceAdmin, serviceAdminError, serviceAdminUrl, useServiceAdminQuery } from "./service-admin-client";

const roles = staffRoleSchema.options;

export function StaffDirectoryScreen({ restaurantId }: { restaurantId: string }) {
  const { result, refresh } = useServiceAdminQuery<StaffMemberView[]>(serviceAdminUrl(restaurantId, { mode: "staff" }));
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | StaffRole>("ALL");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<{ open: true; member?: StaffMemberView } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  const members = result?.data ?? [];
  const query = search.trim().toLocaleLowerCase("es-AR");
  const visible = members.filter((member) => {
    if (!showInactive && !member.active) return false;
    if (roleFilter !== "ALL" && member.role !== roleFilter) return false;
    if (!query) return true;
    return [member.name, member.phone, member.notes, staffRoleLabels[member.role]]
      .some((value) => value.toLocaleLowerCase("es-AR").includes(query));
  });

  const activeCount = members.filter((member) => member.active).length;
  const activeWaitersCount = members.filter((member) => member.active && member.role === "WAITER").length;

  async function toggleActive(member: StaffMemberView) {
    if (togglingId) return;
    setTogglingId(member.id);
    setActionError("");
    setNotice("");
    try {
      await sendServiceAdmin(restaurantId, { action: "set-staff-active", id: member.id, active: !member.active });
      setNotice(member.active ? `${member.name} pasó a estado inactivo.` : `${member.name} volvió a estar activo.`);
      refresh();
    } catch (failure) {
      setActionError(serviceAdminError(failure));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Personal"
        description="Administrá el listado de camareros y personal general del restaurante para asignarlos en el servicio de mesas."
        actions={(
          <button type="button" className={adminPrimaryButtonClass} onClick={() => { setActionError(""); setEditing({ open: true }); }}>
            <Plus size={17} aria-hidden="true" /> Nuevo integrante
          </button>
        )}
      />

      {result?.data && (
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="inline-flex items-center gap-2 rounded-xl border border-[#dce4d9] bg-white px-3.5 py-2 text-zinc-800">
            <Users size={16} aria-hidden="true" className="text-[#3d5934]" />
            <span><strong className="tabular-nums font-semibold text-zinc-950">{activeCount}</strong> activos en total</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-[#dce4d9] bg-[#f3f6f1] px-3.5 py-2 text-[#263e23]">
            <UserCheck size={16} aria-hidden="true" />
            <span><strong className="tabular-nums font-semibold">{activeWaitersCount}</strong> {activeWaitersCount === 1 ? "camarero activo" : "camareros activos"} para mesas</span>
          </div>
        </div>
      )}

      {notice && <p role="status" className="rounded-xl bg-[#e8efe6] px-4 py-3 text-sm font-medium text-[#263e23]">{notice}</p>}
      {actionError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{actionError}</p>}
      {!result && <ServiceLoading message="Cargando el plantel del restaurante…" />}
      {result?.error && <ServiceLoadError message={result.error} onRetry={refresh} />}

      {result?.data && (
        <AdminCard className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:px-5">
            <div className="flex flex-1 flex-wrap gap-3">
              <label className="grid min-w-52 flex-1 gap-1 text-sm font-medium text-zinc-800 sm:max-w-72">
                Buscar integrante
                <span className="relative block">
                  <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input type="search" value={search} placeholder="Nombre, teléfono o notas" onChange={(event) => setSearch(event.target.value)} className={`${serviceInputClass} w-full pl-9`} />
                </span>
              </label>
              <label className="grid min-w-44 gap-1 text-sm font-medium text-zinc-800">
                Rol
                <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "ALL" | StaffRole)} className={serviceInputClass}>
                  <option value="ALL">Todos los roles</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>{staffRoleLabels[role]}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} className="size-4 accent-[#3d5934]" />
              Mostrar inactivos
            </label>
          </div>

          {visible.length === 0 ? (
            <div className="px-4 py-9 text-center sm:px-5">
              <p className="text-sm font-semibold text-zinc-950">
                {members.length === 0 ? "Todavía no hay personal cargado" : "No hay integrantes para mostrar"}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {members.length === 0
                  ? "Agregá los camareros y el personal del restaurante para poder asignarlos al abrir mesas."
                  : "Probá cambiando el filtro de rol, la búsqueda o activá Mostrar inactivos."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left text-sm" aria-label="Listado de personal">
                <thead>
                  <tr className="border-b border-zinc-200 bg-[#f8faf7] text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    <th scope="col" className="px-4 py-3 sm:px-5">Nombre</th>
                    <th scope="col" className="px-4 py-3">Rol</th>
                    <th scope="col" className="px-4 py-3">Teléfono</th>
                    <th scope="col" className="px-4 py-3">Notas / Turno</th>
                    <th scope="col" className="px-4 py-3">Estado</th>
                    <th scope="col" className="px-4 py-3 text-right sm:px-5">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {visible.map((member) => {
                    const busy = togglingId === member.id;
                    return (
                      <tr key={member.id} className={member.active ? "bg-white hover:bg-zinc-50/70" : "bg-zinc-50/70 text-zinc-500"}>
                        <td className="px-4 py-3 font-semibold text-zinc-950 sm:px-5">{member.name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${member.role === "WAITER" ? "bg-[#e8efe6] text-[#263e23]" : "bg-zinc-100 text-zinc-700"}`}>
                            {staffRoleLabels[member.role]}
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-zinc-700">{member.phone || "—"}</td>
                        <td className="max-w-xs px-4 py-3 text-zinc-700">{member.notes || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${member.active ? "bg-emerald-50 text-emerald-800" : "bg-zinc-200/80 text-zinc-700"}`}>
                            {member.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-4 py-3 sm:px-5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              aria-label={`Editar ${member.name}`}
                              disabled={busy}
                              className={`${adminSecondaryButtonClass} min-h-10 px-3 py-2`}
                              onClick={() => { setActionError(""); setEditing({ open: true, member }); }}
                            >
                              <Pencil size={15} aria-hidden="true" /> Editar
                            </button>
                            <button
                              type="button"
                              aria-label={`${member.active ? "Desactivar" : "Reactivar"} ${member.name}`}
                              disabled={busy}
                              className={`${adminSecondaryButtonClass} min-h-10 px-3 py-2`}
                              onClick={() => { void toggleActive(member); }}
                            >
                              <Power size={15} aria-hidden="true" /> {member.active ? "Desactivar" : "Reactivar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      )}

      <p className="text-sm text-zinc-600">
        La cuenta compartida con la que el personal inicia sesión en sala se configura desde{" "}
        <Link className="font-medium text-[#263e23] underline" href={`/admin/restaurants/${encodeURIComponent(restaurantId)}/rooms`}>
          Salones → Configuración
        </Link>.
      </p>

      {editing && (
        <StaffMemberModal
          key={editing.member?.id ?? "new"}
          restaurantId={restaurantId}
          member={editing.member}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setNotice(message);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function StaffMemberModal({ restaurantId, member, onClose, onSaved }: {
  restaurantId: string;
  member?: StaffMemberView;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [role, setRole] = useState<StaffRole>(member?.role ?? "WAITER");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [notes, setNotes] = useState(member?.notes ?? "");
  const [active, setActive] = useState(member?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError("Ingresá el nombre del integrante.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await sendServiceAdmin(restaurantId, {
        action: "save-staff",
        id: member?.id,
        name: name.trim(),
        role,
        phone: phone.trim(),
        notes: notes.trim(),
        active,
      });
      onSaved(member ? "Integrante actualizado." : "Integrante agregado al plantel.");
    } catch (failure) {
      setError(serviceAdminError(failure));
      setBusy(false);
    }
  }

  return (
    <AdminModal open title={member ? "Editar integrante" : "Nuevo integrante"} onClose={() => { if (!busy) onClose(); }}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Nombre
            <input className={serviceInputClass} required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Rol
            <select className={serviceInputClass} value={role} onChange={(event) => setRole(event.target.value as StaffRole)}>
              {roles.map((value) => (
                <option key={value} value={value}>{staffRoleLabels[value]}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Teléfono (opcional)
            <input className={serviceInputClass} maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Notas / Turno (opcional)
            <input className={serviceInputClass} maxLength={200} placeholder="Ej. Turno noche, terraza" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-800">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="size-4 accent-[#3d5934]" />
            Integrante activo
          </label>
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
          <button type="button" className={adminSecondaryButtonClass} disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="submit" className={adminPrimaryButtonClass} disabled={busy}>
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
