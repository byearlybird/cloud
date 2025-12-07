import { serve } from "bun";
import { migrate } from "@/db/migrate";
import { appRoutes } from "./app.routes";

const port = parseInt(Bun.env.PORT || "3000", 10);

await migrate();

const server = serve({
	port,
	fetch: appRoutes.fetch,
	development: Bun.env.NODE_ENV !== "production" && {
		console: true,
	},
});

console.log(`API server running at ${server.url}`);
