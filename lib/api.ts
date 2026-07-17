import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { AuthError } from "@/lib/auth";

/** Standard JSON error shape used by every route. */
export function apiError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/**
 * Wrap a route handler with consistent error handling:
 * AuthError → 401/403, ZodError → 422, anything else → 500.
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>,
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof AuthError) {
        const status = error.code === "FORBIDDEN" ? 403 : 401;
        return apiError(status, error.message);
      }
      if (error instanceof ZodError) {
        return apiError(422, "Validation failed", error.flatten().fieldErrors);
      }
      if (error instanceof HttpError) {
        return apiError(error.status, error.message);
      }
      console.error("[api] unhandled error:", error);
      return apiError(500, "Something went wrong. Please try again.");
    }
  };
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Parse and validate a JSON request body against a Zod schema. */
export async function parseBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  return schema.parseAsync(json);
}
