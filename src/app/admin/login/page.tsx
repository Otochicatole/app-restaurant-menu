"use client";

import { useRouter } from "next/navigation";
import { LoginForm } from "@/features/auth/frontend/components/LoginForm";

export default function AdminLoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-zinc-900">Admin Login</h1>
        <div className="mt-8 bg-white rounded-lg border border-zinc-200 p-6">
          <LoginForm onSuccess={() => router.push("/admin")} />
        </div>
      </div>
    </div>
  );
}
