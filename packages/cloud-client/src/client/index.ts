import { hc } from "hono/client";
import type { AppType } from "@byearlybird/cloud/app";

/**
 * Create a type-safe RPC client for the Cloud API
 * @param baseUrl - The base URL of the API server (e.g., "http://localhost:3000")
 * @returns A fully typed client that infers types from the API routes
 */
export const createClient = (baseUrl: string) => {
	return hc<AppType>(baseUrl);
};

export type Client = ReturnType<typeof createClient>;
