import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import { AuthService, newUserSchema } from "./services/auth";

const storage = createStorage({
	driver: fsDriver({ base: "./data" }),
});

const authService = new AuthService(storage);

// Create a register request schema - only email and password from newUserSchema
const registerSchema = newUserSchema.pick({ email: true, password: true });

const app = new Hono()
	.basePath("/api")
	.post("/auth/signin")
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
