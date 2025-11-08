import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import { AuthService, newUserSchema, signInSchema, type TokenPayload } from "./services/auth";

const storage = createStorage({
	driver: fsDriver({ base: "./data" }),
});

// JWT secret - in production, this should be from environment variable
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

const authService = new AuthService(storage, JWT_SECRET);

// Create a register request schema - only email and password from newUserSchema
const registerSchema = newUserSchema.pick({ email: true, password: true });

// Authentication middleware
const authMiddleware = createMiddleware<{
	Variables: {
		user: TokenPayload;
	};
}>(async (c, next) => {
	const authHeader = c.req.header("Authorization");

	if (!authHeader) {
		return c.json({ error: "Missing authorization header" }, 401);
	}

	// Extract token from "Bearer <token>" format
	const token = authHeader.startsWith("Bearer ")
		? authHeader.slice(7)
		: authHeader;

	const result = await authService.validateToken(token);

	if (!result.ok) {
		const errorMessage =
			result.val === "expired_token" ? "Token has expired" : "Invalid token";
		return c.json({ error: errorMessage }, 401);
	}

	// Set user in context for use in handlers
	c.set("user", result.val);

	await next();
});

const app = new Hono()
	.basePath("/api")
	.post("/auth/signin", zValidator("json", signInSchema), async (c) => {
		const { email, password } = c.req.valid("json");
		const result = await authService.signIn(email, password);

		if (result.ok) {
			const user = result.val;

			// Generate JWT token using AuthService
			const token = await authService.generateToken(user);

			return c.json({ token, user }, 200);
		}

		switch (result.val) {
			case "user_not_found":
			case "invalid_credentials":
				return c.json({ error: "Invalid email or password" }, 401);
			default:
				return c.json({ error: "Unknown error" }, 500);
		}
	})
	.post("/auth/register", zValidator("json", registerSchema), async (c) => {
		const { email, password } = c.req.valid("json");
		const result = await authService.register(email, password);

		if (result.ok) {
			return c.json(result.val, 201);
		}

		switch (result.val) {
			case "already_exists":
				return c.json({ error: "User already exists" }, 409);
			case "invalid_data":
				return c.json({ error: "Invalid data" }, 400);
			default:
				return c.json({ error: "Unknown error" }, 500);
		}
	})
	// Protected collection routes
	.get("/collection/:key", authMiddleware, (c) => {
		const user = c.get("user");
		console.log("Authenticated user:", user.email);
		return c.json({
			message: "Hello from Hono!",
			method: "GET",
			user: {
				id: user.id,
				email: user.email,
			},
		});
	})
	.put("/collection/:key", authMiddleware, (c) => {
		const user = c.get("user");
		return c.json({
			message: "Hello, world!",
			method: "PUT",
			user: {
				id: user.id,
				email: user.email,
			},
		});
	});

export default app;
