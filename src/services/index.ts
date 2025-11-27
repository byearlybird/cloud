import type { env } from "../env";
import { createKV } from "../kv/kv";
import { AuthService } from "./auth";
import { DocumentService } from "./document";

export const createServices = (config: typeof env) => {
	const kv = createKV(config.DATABASE_PATH);

	return {
		auth: new AuthService(
			kv,
			config.ACCESS_TOKEN_SECRET,
			config.REFRESH_TOKEN_SECRET,
			config.ACCESS_TOKEN_EXPIRY,
			config.REFRESH_TOKEN_EXPIRY,
		),
		document: new DocumentService(kv),
	};
};

export type Services = ReturnType<typeof createServices>;
