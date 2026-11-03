import type { ButtonHTMLAttributes } from "react";

// Firefox can restore a button's previous disabled state before React hydrates it.
// Keep these controls governed by React rather than the browser's form history.
export const transientButtonProps = {
  autoComplete: "off",
} satisfies ButtonHTMLAttributes<HTMLButtonElement> & { autoComplete: "off" };
