"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

export type AdminNavigationGuard = (proceed: () => void) => void;
type NavigationGuardContext = {
  requestNavigation: (proceed: () => void) => void;
  registerGuard: (guard: AdminNavigationGuard) => () => void;
};
const unguarded: NavigationGuardContext = {
  requestNavigation: (proceed) => proceed(),
  registerGuard: () => () => undefined,
};
const Context = createContext<NavigationGuardContext>(unguarded);

/** A screen can protect the existing shell's links without changing its navigation. */
export function AdminNavigationGuardProvider({ children }: { children: ReactNode }) {
  const current = useRef<{ token: symbol; guard: AdminNavigationGuard } | null>(null);
  const requestNavigation = useCallback((proceed: () => void) => {
    if (current.current) current.current.guard(proceed);
    else proceed();
  }, []);
  const registerGuard = useCallback((guard: AdminNavigationGuard) => {
    const token = Symbol();
    current.current = { token, guard };
    return () => { if (current.current?.token === token) current.current = null; };
  }, []);
  const value = useMemo(() => ({ requestNavigation, registerGuard }), [requestNavigation, registerGuard]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAdminNavigationGuard(): NavigationGuardContext {
  return useContext(Context);
}

export function useRegisterAdminNavigationGuard(guard: AdminNavigationGuard): void {
  const { registerGuard } = useAdminNavigationGuard();
  useEffect(() => registerGuard(guard), [registerGuard, guard]);
}
