/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminModal } from "./AdminUI";

const TestableAdminModal = AdminModal as React.ComponentType<
  Omit<React.ComponentProps<typeof AdminModal>, "children"> & { children?: React.ReactNode }
>;

afterEach(cleanup);

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return React.createElement(
    React.Fragment,
    null,
    React.createElement("button", { type: "button", onClick: () => setOpen(true) }, "Abrir modal"),
    React.createElement(
      TestableAdminModal,
      {
        open,
        title: "Editar",
        onClose: () => setOpen(false),
      },
      React.createElement("button", { type: "button" }, "Guardar"),
    ),
  );
}

describe("AdminModal", () => {
  it("moves focus inside, closes with Escape and restores the trigger", async () => {
    const user = userEvent.setup();
    render(React.createElement(ModalHarness));
    const trigger = screen.getByRole("button", { name: "Abrir modal" });

    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
