export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };

export type Result<T, E = Error> = Ok<T> | Err<E>;

export const Result = {
	ok<T>(value: T): Ok<T> {
		return { ok: true, value };
	},

	err<E>(error: E): Err<E> {
		return { ok: false, error };
	},

	// Wrap a synchronous function and capture exceptions
	wrap<T, E = Error>(fn: () => T): Result<T, E> {
		try {
			return Result.ok(fn());
		} catch (err) {
			return Result.err(err as E);
		}
	},

	// Wrap an async function and capture exceptions
	async wrapAsync<T, E = Error>(fn: () => Promise<T>): Promise<Result<T, E>> {
		try {
			return Result.ok(await fn());
		} catch (err) {
			return Result.err(err as E);
		}
	},

	// Transform the success value
	map<T, E, U>(r: Result<T, E>, fn: (value: T) => U): Result<U, E> {
		return r.ok ? Result.ok(fn(r.value)) : r;
	},

	// Transform the error value
	mapErr<T, E, F>(r: Result<T, E>, fn: (error: E) => F): Result<T, F> {
		return r.ok ? r : Result.err(fn(r.error));
	},

	// Unwrap the result value or throw the error
	unwrap<T, E>(r: Result<T, E>): T {
		if (r.ok) {
			return r.value;
		}
		throw r.error;
	},
};
