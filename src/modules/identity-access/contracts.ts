import { z } from "zod";

export const loginCommandSchema = z.object({
  email: z.string().trim().email("Invalid email address").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const changePasswordCommandSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12).max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type LoginCommand = z.infer<typeof loginCommandSchema>;
export type ChangePasswordCommand = z.infer<typeof changePasswordCommandSchema>;

export type AdminRole = "SUPER_ADMIN" | "TENANT_ADMIN";

export type LoginView = {
  email: string;
  role: AdminRole;
  tenantSlug: string | null;
  mustChangePassword: boolean;
};

export type SessionView = LoginView & {
  adminId: string;
};

export type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export type {
  CurrentActor,
  SuperAdminActor,
  TenantAdminActor,
} from "./domain/current-actor";
