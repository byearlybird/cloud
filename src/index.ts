import { serve } from "bun";
import app from "./api";

const port = parseInt(Bun.env.PORT || "3000", 10);

const server = serve({
	port,
	fetch: app.fetch,
	development: Bun.env.NODE_ENV !== "production" && {
		console: true,
	},
});

console.log(`API server running at ${server.url}`);
