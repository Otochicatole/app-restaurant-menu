import Link from "next/link";

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h1 className="text-4xl font-bold text-zinc-300">404</h1>
      <p className="mt-2 text-zinc-500">Page not found</p>
      <Link href="/" className="mt-4 text-sm text-zinc-600 underline">
        Go home
      </Link>
    </div>
  );
}
