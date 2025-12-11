declare module "bun" {
	interface Env {
		ACCESS_TOKEN_SECRET: string;
		REFRESH_TOKEN_SECRET: string;
		NODE_ENV?: string;
	}
}
