import { Hono } from "hono";
import { env } from "./env";
import { createAuthRoutes } from "./routes/auth";
import { createDocumentRoutes } from "./routes/document";
import { createServices } from "./services";

// All services created and registered in one place
const services = createServices(env);

const app = new Hono()
	.route("/auth", createAuthRoutes(services.auth))
	.route(
		"/document",
		createDocumentRoutes(services.document, env.ACCESS_TOKEN_SECRET),
	);

export default app;

export type AppType = typeof app;
