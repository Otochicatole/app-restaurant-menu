/** @vitest-environment jsdom */

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { LoginForm } from "./LoginForm";
import { LogoutButton } from "./LogoutButton";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  router.push.mockReset();
  router.refresh.mockReset();
});

describe("identity forms", () => {
  it.each([{ floating: true }, { sidebar: true }, {}])("defers logout until the navigation guard proceeds (%j)", async (props) => {
    const request = vi.fn().mockResolvedValue({ json: async () => ({ success: true, data: null }) });
    vi.stubGlobal("fetch", request);
    let proceed: (() => Promise<void>) | undefined;
    render(React.createElement(LogoutButton, { ...props, onBeforeLogout: (logout) => { proceed = logout; } }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(request).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(proceed).toBeDefined();
    await act(async () => { await proceed!(); });
    expect(request).toHaveBeenCalledWith("/api/auth", { method: "DELETE" });
    expect(router.push).toHaveBeenCalledWith("/admin/login");
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("sends a shared waiter directly to its read-only floor view", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ success: true,
      data: { email: "sala@example.test", role: "WAITER", organizationSlug: "restaurant", mustChangePassword: false } }) }));
    const user = userEvent.setup();
    render(React.createElement(LoginForm));
    await user.type(screen.getByLabelText("Correo electrónico"), "sala@example.test");
    await user.type(screen.getByLabelText("Contraseña"), "password123");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/sala"));
  });

  it("lets the user reveal and hide the login password", async () => {
    const user = userEvent.setup();
    render(React.createElement(LoginForm));
    const password = screen.getByLabelText("Contraseña");

    expect((password as HTMLInputElement).type).toBe("password");
    await user.click(screen.getByRole("button", { name: "Mostrar clave" }));
    expect((password as HTMLInputElement).type).toBe("text");
    await user.click(screen.getByRole("button", { name: "Ocultar clave" }));
    expect((password as HTMLInputElement).type).toBe("password");
  });

  it("sends valid login input and preserves the mandatory-password redirect", async () => {
    const request = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          email: "admin@example.test",
          role: "TENANT_ADMIN",
          organizationSlug: "restaurant",
          mustChangePassword: true,
        },
      }),
    });
    vi.stubGlobal("fetch", request);
    const user = userEvent.setup();
    render(React.createElement(LoginForm));

    await user.type(screen.getByLabelText("Correo electrónico"), "admin@example.test");
    await user.type(screen.getByLabelText("Contraseña"), "password123");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/admin/account/password"));
    expect(request).toHaveBeenCalledWith(
      "/api/auth",
      expect.objectContaining({ method: "POST" }),
    );
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("recovers from a password-request network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const user = userEvent.setup();
    render(React.createElement(ChangePasswordForm));

    await user.type(screen.getByLabelText("Contraseña actual"), "current-password");
    await user.type(screen.getByLabelText("Nueva contraseña"), "new-password-123");
    await user.type(screen.getByLabelText("Repetí la nueva contraseña"), "new-password-123");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(await screen.findByText("No pudimos conectar con el servidor. Volvé a intentarlo.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar contraseña" })).toBeTruthy();
  });

  it("returns a superadmin to its own panel after changing the password", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({ success: true, data: null }),
    }));
    const user = userEvent.setup();
    render(React.createElement(ChangePasswordForm, { successPath: "/superadmin" }));

    await user.type(screen.getByLabelText("Contraseña actual"), "current-password");
    await user.type(screen.getByLabelText("Nueva contraseña"), "new-password-123");
    await user.type(screen.getByLabelText("Repetí la nueva contraseña"), "new-password-123");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/superadmin"));
  });
});
