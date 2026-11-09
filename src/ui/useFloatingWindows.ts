"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";

export type FloatingWindow<T> = {
  id: string; value: T; visible: boolean; zIndex: number; offset: number; activation: number;
};
export type WindowState<T> = { windows: FloatingWindow<T>[]; stack: string[]; activation: number; cascade: number };

export function emptyWindows<T>(): WindowState<T> {
  return { windows: [], stack: [], activation: 0, cascade: 0 };
}

function normalize<T>(state: WindowState<T>): WindowState<T> {
  const top = Math.min(49, 29 + state.stack.length);
  const layers = new Map(state.stack.map((id, index) => [id, Math.max(30, top - (state.stack.length - 1 - index))]));
  return { ...state, windows: state.windows.map((window) => {
    const zIndex = layers.get(window.id) ?? 30;
    return window.zIndex === zIndex ? window : { ...window, zIndex };
  }) };
}

type WindowEvent<T> = { type: "open"; id: string; value: T } | { type: "hide" | "close" | "focus"; id: string } | { type: "clear" };

/** Keep creation order stable so bringing forward a tool preserves its form. */
export function updateWindows<T>(state: WindowState<T>, event: WindowEvent<T>): WindowState<T> {
  if (event.type === "clear") return state.windows.length ? emptyWindows() : state;
  const id = event.id;
  const existing = state.windows.find((window) => window.id === id);
  const rest = state.stack.filter((key) => key !== id);
  switch (event.type) {
    case "open": {
      const activation = state.activation + 1;
      const windows = existing
        ? state.windows.map((window) => window.id === id ? { ...window, visible: true, activation } : window)
        : [...state.windows, { id, value: event.value, visible: true, zIndex: 30, offset: (state.cascade % 6) * 24, activation }];
      return normalize({ windows, stack: [...rest, id], activation, cascade: state.cascade + (existing ? 0 : 1) });
    }
    case "hide":
      return existing?.visible ? normalize({ ...state, windows: state.windows.map((window) => window.id === id ? { ...window, visible: false } : window), stack: rest }) : state;
    case "close":
      return existing ? normalize({ ...state, windows: state.windows.filter((window) => window.id !== id), stack: rest }) : state;
    case "focus":
      return existing?.visible && state.stack.at(-1) !== id ? normalize({ ...state, stack: [...rest, id] }) : state;
  }
}

export function useFloatingWindows<T>([state, setState]: readonly [WindowState<T>, Dispatch<SetStateAction<WindowState<T>>>]) {
  const open = useCallback((id: string, value: T) => setState((state) => updateWindows(state, { type: "open", id, value })), [setState]);
  const hide = useCallback((id: string) => setState((state) => updateWindows(state, { type: "hide", id })), [setState]);
  const close = useCallback((id: string) => setState((state) => updateWindows(state, { type: "close", id })), [setState]);
  const focus = useCallback((id: string) => setState((state) => updateWindows(state, { type: "focus", id })), [setState]);
  const clear = useCallback(() => setState((state) => updateWindows(state, { type: "clear" })), [setState]);
  const isVisible = useCallback((id: string) => state.windows.some((window) => window.id === id && window.visible), [state.windows]);
  return { windows: state.windows, open, hide, close, focus, clear, isVisible };
}
