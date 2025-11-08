import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import { AuthService, newUserSchema, signInSchema } from "./services/auth";

const storage = createStorage({
	driver: fsDriver({ base: "./data" }),
});

const authService = new AuthService(storage);

// JWT secret - in production, this should be from environment variable
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Create a register request schema - only email and password from newUserSchema
const registerSchema = newUserSchema.pick({ email: true, password: true });

const app = new Hono()
	.basePath("/api")
	.post("/auth/signin", zValidator("json", signInSchema), async (c) => {
		const { email, password } = c.req.valid("json");
		const result = await authService.signIn(email, password);

		if (result.ok) {
			const user = result.val;

			// Generate JWT token with user id and email
			const token = await sign(
				{
					id: user.id,
					email: user.email,
					exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
				},
				JWT_SECRET,
			);

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
	.get("/collection/:key", (c) => {
		console.log("Hono hello");
		return c.json({
			message: "Hello from Hono!",
			method: "GET",
		});
	})
	.put("/collection/:key", (c) =>
		c.json({
			message: "Hello, world!",
			method: "PUT",
		}),
	);

export default app;
