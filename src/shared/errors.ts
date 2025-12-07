import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class ApiError extends Error {
	constructor(
		public readonly status: ContentfulStatusCode,
		message: string,
		public readonly details?: unknown,
	) {
		super(message);
	}

	toJSONResponse(c: Context) {
		return c.json(
			{
				error: this.message,
				...(this.details !== undefined ? { details: this.details } : {}),
			},
			this.status,
		);
	}
}

export class ValidationError extends ApiError {
	constructor(details?: unknown, message = "Invalid request body") {
		super(400, message, details);
	}
}

export class UnauthorizedError extends ApiError {
	constructor(
		message = "Unauthorized",
		public readonly reason?: string,
	) {
		super(401, message);
	}
}

export class InvalidTokenError extends ApiError {
	constructor(message = "Invalid or expired token") {
		super(401, message);
	}
}

export class ConflictError extends ApiError {
	constructor(message = "Conflict") {
		super(409, message);
	}
}

export class NotFoundError extends ApiError {
	constructor(message = "Not Found") {
		super(404, message);
	}
}

export class InternalServerError extends ApiError {
	constructor(message = "Internal server error") {
		super(500, message);
	}
}
