import type { env } from "../env";
import { db } from "../db";
import { AuthService } from "./auth";
import { DocumentService } from "./document";

export const createServices = (config: typeof env) => {
	return {
		auth: new AuthService(
			db,
			config.ACCESS_TOKEN_SECRET,
			config.REFRESH_TOKEN_SECRET,
			config.ACCESS_TOKEN_EXPIRY,
			config.REFRESH_TOKEN_EXPIRY,
		),
		document: new DocumentService(db),
	};
};

export type Services = ReturnType<typeof createServices>;
