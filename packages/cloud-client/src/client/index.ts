import type { AppRoutes } from "@byearlybird/cloud";
import { hc } from "hono/client";

/**
 * Create a type-safe RPC client for the Cloud API
 * @param baseUrl - The base URL of the API server (e.g., "http://localhost:3000")
 * @returns A fully typed client that infers types from the API routes
 */
export const createClient = (baseUrl: string) => {
	return hc<AppRoutes>(baseUrl);
};

export type Client = ReturnType<typeof createClient>;
