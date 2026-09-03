/** @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HexColorInput, isValidHexColor } from "./HexColorInput";

afterEach(cleanup);

describe("HexColorInput", () => {
  it("applies complete hexadecimal values and ignores incomplete input", () => {
    const onChange = vi.fn();
    render(React.createElement(HexColorInput, { label: "Color", value: "#ffffff", onChange }));
    const input = screen.getByRole("textbox", { name: "Código HEX de color" });
    fireEvent.change(input, { target: { value: "#0459" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(input, { target: { value: "#0459c8" } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("#0459c8");
    expect(input.getAttribute("aria-invalid")).toBe("false");
  });

  it("supports alpha only when the field allows it", () => {
    expect(isValidHexColor("#0459c8")).toBe(true);
    expect(isValidHexColor("#0459c880")).toBe(true);
    expect(isValidHexColor("#0459c880", false)).toBe(false);
    expect(isValidHexColor("0459c8")).toBe(false);
  });
});
