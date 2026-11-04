"use client";

import { useCallback, useState } from "react";

export type FloatingWindow<T> = {
  id: string; value: T; visible: boolean; zIndex: number; offset: number; activation: number;
};
type WindowState<T> = { windows: FloatingWindow<T>[]; stack: string[]; activation: number; cascade: number };

function normalize<T>(state: WindowState<T>): WindowState<T> {
  const top = Math.min(49, 29 + state.stack.length);
  const layers = new Map(state.stack.map((id, index) => [id, Math.max(30, top - (state.stack.length - 1 - index))]));
  return { ...state, windows: state.windows.map((window) => {
    const zIndex = layers.get(window.id) ?? 30;
    return window.zIndex === zIndex ? window : { ...window, zIndex };
  }) };
}

/** Local tool windows retain their creation order so bringing one forward never remounts its contents. */
export function useFloatingWindows<T>() {
  const [state, setState] = useState<WindowState<T>>({ windows: [], stack: [], activation: 0, cascade: 0 });
  const open = useCallback((id: string, value: T) => {
    setState((current) => {
      const existing = current.windows.some((window) => window.id === id);
      const activation = current.activation + 1;
      const windows = existing
        ? current.windows.map((window) => window.id === id ? { ...window, visible: true, activation } : window)
        : [...current.windows, { id, value, visible: true, zIndex: 30, offset: (current.cascade % 6) * 24, activation }];
      return normalize({ windows, stack: [...current.stack.filter((key) => key !== id), id], activation, cascade: current.cascade + (existing ? 0 : 1) });
    });
  }, []);
  const hide = useCallback((id: string) => {
    setState((current) => {
      if (!current.windows.some((window) => window.id === id && window.visible)) return current;
      return normalize({ ...current, windows: current.windows.map((window) => window.id === id ? { ...window, visible: false } : window), stack: current.stack.filter((key) => key !== id) });
    });
  }, []);
  const close = useCallback((id: string) => {
    setState((current) => {
      if (!current.windows.some((window) => window.id === id)) return current;
      return normalize({ ...current, windows: current.windows.filter((window) => window.id !== id), stack: current.stack.filter((key) => key !== id) });
    });
  }, []);
  const focus = useCallback((id: string) => {
    setState((current) => {
      if (current.stack.at(-1) === id || !current.windows.some((window) => window.id === id && window.visible)) return current;
      return normalize({ ...current, stack: [...current.stack.filter((key) => key !== id), id] });
    });
  }, []);
  const clear = useCallback(() => { setState((current) => current.windows.length ? { windows: [], stack: [], activation: 0, cascade: 0 } : current); }, []);
  const isVisible = useCallback((id: string) => state.windows.some((window) => window.id === id && window.visible), [state.windows]);
  return { windows: state.windows, open, hide, close, focus, clear, isVisible };
}
