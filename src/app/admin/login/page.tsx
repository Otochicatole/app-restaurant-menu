"use client";

import { useRouter } from "next/navigation";
import { LoginForm } from "@/features/auth/frontend/components/LoginForm";

export default function AdminLoginPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-emerald-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-200 text-xl font-black text-emerald-950">F</div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-emerald-200">Sign in to manage your menu.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
          <LoginForm onSuccess={() => router.push("/admin")} />
        </div>
      </div>
    </div>
  );
}
