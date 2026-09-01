export type LogContext = Readonly<Record<string, unknown>>;

export const logger = {
  error(message: string, error?: unknown, context?: LogContext): void {
    console.error(message, {
      ...context,
      ...(error === undefined ? {} : { error: serializeError(error) }),
    });
  },
  info(message: string, context?: LogContext): void {
    console.info(message, context ?? {});
  },
  warn(message: string, context?: LogContext): void {
    console.warn(message, context ?? {});
  },
};

function serializeError(error: unknown): unknown {
  if (!(error instanceof Error)) return error;
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...("code" in error ? { code: error.code } : {}),
  };
}
