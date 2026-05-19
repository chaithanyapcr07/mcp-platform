export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "api_error",
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export const notFound = (resource: string) => new ApiError(404, `${resource} not found`, "not_found");
export const forbidden = (reason: string) => new ApiError(403, reason, "forbidden");
export const badRequest = (reason: string, details?: unknown) => new ApiError(400, reason, "bad_request", details);
