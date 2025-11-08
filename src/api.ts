import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { JwtVariables } from "hono/jwt";
import { jwt } from "hono/jwt";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import { AuthService, newUserSchema, signInSchema } from "./services/auth";

const storage = createStorage({
	driver: fsDriver({ base: "./data" }),
});

// JWT secret - in production, this should be from environment variable
const JWT_SECRET =
	process.env.JWT_SECRET || "your-secret-key-change-in-production";

const authService = new AuthService(storage, JWT_SECRET);

// Create a register request schema - only email and password from newUserSchema
const registerSchema = newUserSchema.pick({ email: true, password: true });

const app = new Hono<{ Variables: JwtVariables }>()
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
				// use 401 for obscurity
				return c.json({ error: "Invalid email or password" }, 401);
			case "invalid_credentials":
				return c.json({ error: "Invalid email or password" }, 401);
			default:
				return c.json({ error: "Unknown error" }, 500);
		}
	})
	.post("/auth/signup", zValidator("json", registerSchema), async (c) => {
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
	// Protected collection routes - use built-in JWT middleware
	.use("/collection/*", jwt({ secret: JWT_SECRET }))
	.get("/collection/:key", (c) => {
		const payload = c.get("jwtPayload");
		console.log("Authenticated user:", payload.email);
		return c.json({
			message: "Hello from Hono!",
			method: "GET",
			user: {
				id: payload.sub, // Standard JWT 'sub' claim contains user ID
				email: payload.email,
			},
		});
	})
	.put("/collection/:key", (c) => {
		const payload = c.get("jwtPayload");
		return c.json({
			message: "Hello, world!",
			method: "PUT",
			user: {
				id: payload.sub, // Standard JWT 'sub' claim contains user ID
				email: payload.email,
			},
		});
	});

export default app;
