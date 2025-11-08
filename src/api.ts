import { Hono } from "hono";
import { env } from "./env";
import { createAuthRoutes } from "./routes/auth";
import { createCollectionRoutes } from "./routes/collection";
import { createServices } from "./services";

// All services created and registered in one place
const services = createServices(env);

const app = new Hono()
	.basePath("/api")
	.route("/auth", createAuthRoutes(services.auth))
	.route(
		"/collection",
		createCollectionRoutes(services.collection, env.ACCESS_TOKEN_SECRET),
	);

export default app;
