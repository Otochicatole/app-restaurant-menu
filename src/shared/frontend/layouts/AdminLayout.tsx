import Link from "next/link";
import { LogoutButton } from "@/shared/frontend/components/LogoutButton";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-semibold text-zinc-900">
              CMS
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin/products" className="text-zinc-600 hover:text-zinc-900">
                Products
              </Link>
              <Link href="/admin/groups" className="text-zinc-600 hover:text-zinc-900">
                Groups
              </Link>
              <Link href="/admin/home-page" className="text-zinc-600 hover:text-zinc-900">
                Home Page
              </Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
