import { Store } from "@tanstack/store";
import type { Client } from "../client";

/**
 * User type (without password)
 */
export type User = {
	id: string;
	email: string;
	encryptedMasterKey: string;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * Auth state shape
 */
export type AuthState = {
	user: User | null;
	accessToken: string | null;
	refreshToken: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
};

/**
 * Initial auth state
 */
const initialState: AuthState = {
	user: null,
	accessToken: null,
	refreshToken: null,
	isAuthenticated: false,
	isLoading: false,
	error: null,
};

/**
 * Create an auth store with RPC client integration
 * @param client - The Hono RPC client
 * @returns Auth store instance with methods
 */
export const createAuthStore = (client: Client) => {
	const store = new Store<AuthState>(initialState);

	/**
	 * Sign up a new user
	 */
	const signUp = async (
		email: string,
		password: string,
		encryptedMasterKey: string,
	) => {
		store.setState((s) => ({ ...s, isLoading: true, error: null }));

		try {
			const res = await client.auth.signup.$post({
				json: { email, password, encryptedMasterKey },
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(
					typeof data === "object" && data && "error" in data
						? String(data.error)
						: "Signup failed",
				);
			}

			if (typeof data === "object" && data && "data" in data) {
				const responseData = data.data as {
					user: User;
					accessToken: string;
					refreshToken: string;
				};

				store.setState({
					user: responseData.user,
					accessToken: responseData.accessToken,
					refreshToken: responseData.refreshToken,
					isAuthenticated: true,
					isLoading: false,
					error: null,
				});
			} else {
				throw new Error("Invalid response format");
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Signup failed";
			store.setState((s) => ({
				...s,
				isLoading: false,
				error: errorMessage,
			}));
			throw error;
		}
	};

	/**
	 * Sign in an existing user
	 */
	const signIn = async (email: string, password: string) => {
		store.setState((s) => ({ ...s, isLoading: true, error: null }));

		try {
			const res = await client.auth.signin.$post({
				json: { email, password },
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(
					typeof data === "object" && data && "error" in data
						? String(data.error)
						: "Signin failed",
				);
			}

			if (typeof data === "object" && data && "data" in data) {
				const responseData = data.data as {
					user: User;
					accessToken: string;
					refreshToken: string;
				};

				store.setState({
					user: responseData.user,
					accessToken: responseData.accessToken,
					refreshToken: responseData.refreshToken,
					isAuthenticated: true,
					isLoading: false,
					error: null,
				});
			} else {
				throw new Error("Invalid response format");
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Signin failed";
			store.setState((s) => ({
				...s,
				isLoading: false,
				error: errorMessage,
			}));
			throw error;
		}
	};

	/**
	 * Refresh the access token using the refresh token
	 */
	const refresh = async () => {
		const currentRefreshToken = store.state.refreshToken;

		if (!currentRefreshToken) {
			throw new Error("No refresh token available");
		}

		store.setState((s) => ({ ...s, isLoading: true, error: null }));

		try {
			const res = await client.tokens.refresh.$post({
				json: { refreshToken: currentRefreshToken },
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(
					typeof data === "object" && data && "error" in data
						? String(data.error)
						: "Token refresh failed",
				);
			}

			if (typeof data === "object" && data && "data" in data) {
				const responseData = data.data as {
					accessToken: string;
					refreshToken: string;
				};

				store.setState((s) => ({
					...s,
					accessToken: responseData.accessToken,
					refreshToken: responseData.refreshToken,
					isLoading: false,
					error: null,
				}));
			} else {
				throw new Error("Invalid response format");
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Token refresh failed";
			store.setState((s) => ({
				...s,
				isLoading: false,
				error: errorMessage,
			}));
			// Clear auth state on refresh failure
			store.setState(initialState);
			throw error;
		}
	};

	/**
	 * Sign out the current user
	 */
	const signOut = async () => {
		const currentRefreshToken = store.state.refreshToken;

		// Revoke token if available
		if (currentRefreshToken) {
			try {
				await client.tokens.revoke.$post({
					json: { refreshToken: currentRefreshToken },
				});
			} catch (error) {
				// Log but don't throw - always clear local state
				console.error("Failed to revoke token:", error);
			}
		}

		// Clear local state
		store.setState(initialState);
	};

	/**
	 * Get the current access token (useful for making authenticated requests)
	 */
	const getAccessToken = () => store.state.accessToken;

	return {
		store,
		signUp,
		signIn,
		refresh,
		signOut,
		getAccessToken,
	};
};

export type AuthStore = ReturnType<typeof createAuthStore>;
