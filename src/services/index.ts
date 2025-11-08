import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import type { env } from "../env";
import { AuthService } from "./auth";
import { CollectionService } from "./collection";

export const createServices = (config: typeof env) => {
	const storage = createStorage({
		driver: fsDriver({ base: "./data" }),
	});

	return {
		auth: new AuthService(
			storage,
			config.ACCESS_TOKEN_SECRET,
			config.REFRESH_TOKEN_SECRET,
			config.ACCESS_TOKEN_EXPIRY,
			config.REFRESH_TOKEN_EXPIRY,
		),
		collection: new CollectionService(storage),
	};
};

export type Services = ReturnType<typeof createServices>;
