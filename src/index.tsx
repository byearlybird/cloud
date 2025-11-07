import { serve } from "bun";
import { Hono } from "hono";
import index from "./index.html";

const app = new Hono().basePath("/api");

app.get("/hello", (c) => {
	console.log("Hono hello");
	return c.json({
		message: "Hello from Hono!",
		method: "GET",
	});
});
app.put("/hello", (c) =>
	c.json({
		message: "Hello, world!",
		method: "PUT",
	}),
);

const server = serve({
	routes: {
		// Serve index.html for all unmatched routes.
		"/*": index,
		"/api/*": app.fetch,
	},

	development: process.env.NODE_ENV !== "production" && {
		// Enable browser hot reloading in development
		hmr: true,

		// Echo console logs from the browser to the server
		console: true,
	},
});

console.log(`🚀 Server running at ${server.url}`);
