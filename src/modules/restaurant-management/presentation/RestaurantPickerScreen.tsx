"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { LogoutButton } from "@/modules/identity-access/ui";
import { AdminModal } from "@/ui/admin/AdminUI";
import type { RestaurantWorkspace } from "../contracts";
import type { RestaurantActionResult } from "./actions";

type Action = (form: FormData) => Promise<RestaurantActionResult>;
const fieldClass = "w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-[#253621] focus:ring-4 focus:ring-[#253621]/15";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#182618] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#253621] disabled:opacity-50";

export function RestaurantPickerScreen({ workspace, selectRestaurant, createRestaurant, deleteRestaurants }: {
  workspace: RestaurantWorkspace; selectRestaurant: Action; createRestaurant: Action; deleteRestaurants: Action;
}) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string[] | null>(null);
  const [password, setPassword] = useState("");
  function run(action: Action, form: FormData) {
    startTransition(async () => {
      setNotice(null);
      try {
        const result = await action(form);
        if (!result.success) setNotice(result.error.message);
        else { setDeleting(null); setPassword(""); }
      } catch (error) {
        unstable_rethrow(error);
        setNotice("No pudimos conectar con el servidor. Volvé a intentarlo.");
      }
    });
  }
  return (
    <main data-admin-panel className="min-h-screen bg-[#f8faf7] px-5 py-10 text-zinc-900 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <header>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-zinc-700">{workspace.organizationName}</p>
            <div className="flex items-center gap-4"><Link href="/admin/account" className="text-sm underline underline-offset-4">Mi cuenta</Link><LogoutButton compact /></div>
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Tus restaurantes</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-700">Elegí un restaurante para administrar su carta, landing y reservas.</p>
          <p className="mt-3 text-sm text-zinc-700">{workspace.restaurants.length} de {workspace.maxRestaurants} restaurantes</p>
        </header>
        {notice && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{notice}</p>}
        <section className="mt-8 space-y-3" aria-label="Restaurantes">
          {workspace.restaurants.map((restaurant) => (
            <article key={restaurant.id} className="rounded-xl bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><h2 className="break-words text-lg font-semibold">{restaurant.name}</h2><p className="mt-1 text-sm text-zinc-700">{restaurant.publicDescription}</p></div>
                <button type="button" disabled={pending} aria-label={`Eliminar ${restaurant.name}`} onClick={() => { setDeleting([restaurant.id]); setPassword(""); setNotice(null); }} className="rounded-lg p-2 text-zinc-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><Trash2 size={17} /></button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
                <a href={`/m/${restaurant.slug}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">Ver carta</a>
                {restaurant.landingEnabled && <a href={`/l/${restaurant.landingSlug}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">Ver landing</a>}
                {restaurant.status === "ACTIVE" ? <form className="ml-auto" action={(form) => run(selectRestaurant, form)}><input type="hidden" name="restaurantId" value={restaurant.id} /><button disabled={pending} className={buttonClass}>Abrir <ArrowRight size={16} /></button></form> : <p className="ml-auto font-medium text-zinc-700">Suspendido</p>}
              </div>
            </article>
          ))}
          {workspace.restaurants.length === 0 && <div className="rounded-xl bg-white p-6"><h2 className="text-lg font-semibold">Todavía no hay restaurantes</h2><p className="mt-2 text-sm leading-6 text-zinc-700">Creá el primero para comenzar. Cada restaurante tendrá su propio espacio.</p></div>}
        </section>
        {workspace.canCreateRestaurant ? <button type="button" onClick={() => setCreating(!creating)} className={`${buttonClass} mt-6`}><Plus size={16} />{creating ? "Cerrar formulario" : "Agregar restaurante"}</button> : <p className="mt-5 text-sm leading-6 text-zinc-700">Alcanzaste el cupo. Pedile al administrador de la plataforma que aumente el límite si necesitás más restaurantes.</p>}
        {creating && workspace.canCreateRestaurant && <form onSubmit={(event) => { event.preventDefault(); run(createRestaurant, new FormData(event.currentTarget)); }} className="mt-4 grid gap-4 rounded-xl bg-white p-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">Nombre<input name="name" required maxLength={100} placeholder="Restaurante Centro" className={fieldClass} /></label>
          <label className="grid gap-2 text-sm font-medium">Slug público<input name="slug" required minLength={3} maxLength={50} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="restaurante-centro" className={fieldClass} /></label>
          <label className="grid gap-2 text-sm font-medium sm:col-span-2">Descripción<input name="publicDescription" defaultValue="Menú digital" maxLength={500} className={fieldClass} /></label>
          <p className="text-sm leading-6 text-zinc-700 sm:col-span-2">Se creará una carta vacía. El superadmin puede habilitar la landing y las reservas de este restaurante.</p>
          <button disabled={pending} className={`${buttonClass} justify-self-start`}>{pending ? "Creando…" : "Crear y abrir"}</button>
        </form>}
        {workspace.restaurants.length > 1 && <button type="button" disabled={pending} onClick={() => { setDeleting(workspace.restaurants.map((restaurant) => restaurant.id)); setPassword(""); setNotice(null); }} className="mt-8 block text-sm text-red-700 underline underline-offset-4">Eliminar todos los restaurantes</button>}
        <AdminModal open={deleting !== null} title={deleting?.length === 1 ? "Eliminar restaurante" : "Eliminar restaurantes"} onClose={() => { if (!pending) { setDeleting(null); setNotice(null); } }}>
          <form action={(form) => run(deleteRestaurants, form)} className="space-y-4">
            <p className="text-sm leading-6 text-zinc-700">Se eliminarán definitivamente {deleting?.map((id) => workspace.restaurants.find((restaurant) => restaurant.id === id)?.name).join(", ")}, incluyendo sus cartas, landings, reservas, eventos, plantillas y archivos. Esta acción no se puede deshacer.</p>
            {deleting?.map((id) => <input key={id} type="hidden" name="restaurantId" value={id} />)}
            <label className="grid gap-2 text-sm font-medium">Contraseña actual<input name="currentPassword" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClass} /></label>
            {notice && <p role="alert" className="text-sm text-red-800">{notice}</p>}
            <div className="flex justify-end gap-3"><button type="button" disabled={pending} onClick={() => setDeleting(null)} className="px-3 py-2 text-sm">Cancelar</button><button disabled={pending || !password.trim()} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Eliminando…" : "Eliminar definitivamente"}</button></div>
          </form>
        </AdminModal>
      </div>
    </main>
  );
}
