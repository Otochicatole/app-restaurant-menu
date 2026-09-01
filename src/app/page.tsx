import Link from "next/link";

export default function PlatformHomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-950 px-6 py-16 text-white">
      <div className="w-full max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-200">Menús digitales</p>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-7xl">Tu menú, siempre listo.</h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-emerald-100 sm:text-lg">
          Administrá tus productos y compartí una carta pública clara desde un solo lugar.
        </p>
        <Link href="/admin/login" className="mt-10 inline-flex rounded-xl bg-amber-200 px-6 py-3 text-sm font-bold text-emerald-950 transition hover:bg-amber-100">
          Ingresar al panel
        </Link>
      </div>
    </main>
  );
}
