/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeaturedProductsForm } from "./FeaturedProductsForm";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const products = [
  { id: "coffee", name: "Café", groupName: "Bebidas", price: 3 },
  { id: "cake", name: "Torta", groupName: "Postres", price: 5 },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FeaturedProductsForm", () => {
  it("prevents selecting the same product in two positions", async () => {
    const user = userEvent.setup();
    render(React.createElement(FeaturedProductsForm, {
      products,
      featured: [null, null, null],
      onSave: vi.fn(async () => ({ success: true as const, data: undefined })),
    }));

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "coffee");

    const duplicatedOption = within(selects[1]).getByRole("option", { name: /Café/ }) as HTMLOptionElement;
    expect(duplicatedOption.disabled).toBe(true);
  });
});
