import type { Context } from "hono";
import type { SuccessStatusCode } from "hono/utils/http-status";

type ResponseBody = object | string | null;

function apiResponse(
	c: Context,
	status: SuccessStatusCode,
	body: ResponseBody = null,
) {
	if (status === 204 || status === 205) {
		return c.body(null, status);
	}

	if (typeof body === "string") {
		return c.json({ message: body }, status);
	}

	return c.json(body, status);
}

export function okResponse<T extends object | string>(c: Context, body: T) {
	return apiResponse(c, 200, body);
}

export function createdResponse<T extends object | string>(
	c: Context,
	body: T,
) {
	return apiResponse(c, 201, body);
}

export function noContentResponse(c: Context) {
	return apiResponse(c, 204);
}
