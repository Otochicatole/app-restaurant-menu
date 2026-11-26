"use client";

import { configureStore, createAction, createReducer, type ActionReducerMapBuilder } from "@reduxjs/toolkit";
import { Provider, useSelector, useStore } from "react-redux";
import { useCallback, useState, type ReactNode, type SetStateAction } from "react";

/** Each mounted workspace owns its store and its server-provided seed. */
export function createEditorWorkspace<State extends object>(
  name: string,
  configure?: (builder: ActionReducerMapBuilder<State>) => void,
) {
  const changed = createAction<Partial<State>>(`${name}/workspaceChanged`);

  function makeStore(seed: State) {
    const reducer = createReducer(seed, (builder) => {
      configure?.(builder);
      builder.addCase(changed, (state, action) => Object.assign(state, action.payload));
    });
    return configureStore({ reducer, devTools: false });
  }

  function WorkspaceProvider({ seed, children }: { seed: State; children: ReactNode }) {
    const [store] = useState(() => makeStore(seed));
    return <Provider store={store} serverState={seed}>{children}</Provider>;
  }

  const useWorkspaceStore = useStore.withTypes<ReturnType<typeof makeStore>>();
  const useWorkspaceSelector = useSelector.withTypes<State>();

  function useFieldSetter<Key extends keyof State>(key: Key) {
    const store = useWorkspaceStore();
    return useCallback((next: SetStateAction<State[Key]>) => {
      const previous = store.getState()[key];
      const value = typeof next === "function" ? (next as (value: State[Key]) => State[Key])(previous) : next;
      if (!Object.is(value, previous)) {
        const patch: Partial<State> = {};
        patch[key] = value;
        store.dispatch(changed(patch));
      }
    }, [key, store]);
  }

  function useField<Key extends keyof State>(key: Key) {
    const value = useWorkspaceSelector((state) => state[key]);
    const setValue = useFieldSetter(key);
    return [value, setValue] as const;
  }

  return { Provider: WorkspaceProvider, makeStore, useStore: useWorkspaceStore, useSelector: useWorkspaceSelector, useField, useFieldSetter, changed };
}
