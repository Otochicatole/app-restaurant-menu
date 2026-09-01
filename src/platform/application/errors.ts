export type ApplicationErrorCode =
  | "BAD_REQUEST"
  | "CONFLICT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR";

export class ApplicationError extends Error {
  constructor(
    public readonly code: ApplicationErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export class BadRequestError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("BAD_REQUEST", message, details);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("CONFLICT", message, details);
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, { resource });
  }
}

export class RateLimitedError extends ApplicationError {
  constructor(retryAfterSeconds: number) {
    super("RATE_LIMITED", "Too many attempts", { retryAfterSeconds });
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super("VALIDATION_ERROR", message, fieldErrors ? { fieldErrors } : undefined);
  }
}
