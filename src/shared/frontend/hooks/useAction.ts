import { useState, useTransition } from "react";

interface ActionState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

export function useAction<T, Args extends unknown[]>(
  action: (...args: Args) => Promise<{ success: boolean; data?: T; error?: { message: string } }>
) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ActionState<T>>({
    loading: false,
    error: null,
    data: null,
  });

  const execute = (...args: Args) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    startTransition(async () => {
      try {
        const result = await action(...args);
        if (result.success) {
          setState({ loading: false, error: null, data: (result.data as T) ?? null });
        } else {
          setState({ loading: false, error: result.error?.message ?? "An error occurred", data: null });
        }
      } catch {
        setState({ loading: false, error: "An unexpected error occurred", data: null });
      }
    });
  };

  return { execute, ...state, loading: state.loading || isPending };
}
