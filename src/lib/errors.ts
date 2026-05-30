import type { ErrorCode } from "@/shared/types";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, string>) {
    super("VALIDATION_ERROR", "Validation failed", 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 409);
  }
}

export class ForbiddenError extends AppError {
  constructor(code: ErrorCode = "FORBIDDEN", message = "Access denied") {
    super(code, message, 403);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class GoneError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 410);
  }
}

export class BadRequestError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, 400);
  }
}
