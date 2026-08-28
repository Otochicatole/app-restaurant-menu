/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomePageForm } from "./HomePageForm";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("HomePageForm", () => {
  it("shows transport failures and returns the form to an actionable state", async () => {
    const onSubmit = vi.fn(async () => { throw new Error("offline"); });
    const user = userEvent.setup();
    render(React.createElement(HomePageForm, { onSubmit }));

    await user.type(screen.getByLabelText("Título"), "Menú del día");
    await user.type(screen.getByLabelText("Descripción"), "Opciones frescas");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect((await screen.findByRole("alert")).textContent).toContain("servidor");
    expect((screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement).disabled).toBe(false);
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
