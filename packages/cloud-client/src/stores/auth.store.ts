import { Store } from "@tanstack/store";
import { get, set } from "idb-keyval";
import type { Client } from "../client";
import type { KeyStore } from "./key.store";

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
 * IndexedDB storage keys
 */
const STORAGE_KEYS = {
	user: "auth:user",
	accessToken: "auth:accessToken",
	refreshToken: "auth:refreshToken",
	isAuthenticated: "auth:isAuthenticated",
} as const;

/**
 * Load persisted auth state from IndexedDB
 */
const loadPersistedState = async (): Promise<Partial<AuthState>> => {
	try {
		const [user, accessToken, refreshToken, isAuthenticated] =
			await Promise.all([
				get(STORAGE_KEYS.user),
				get(STORAGE_KEYS.accessToken),
				get(STORAGE_KEYS.refreshToken),
				get(STORAGE_KEYS.isAuthenticated),
			]);

		return {
			user: user ?? null,
			accessToken: accessToken ?? null,
			refreshToken: refreshToken ?? null,
			isAuthenticated: isAuthenticated ?? false,
		};
	} catch (error) {
		console.error("Failed to load auth state:", error);
		return {};
	}
};

/**
 * Persist auth state to IndexedDB
 */
const persistState = async (state: AuthState) => {
	try {
		await Promise.all([
			set(STORAGE_KEYS.user, state.user),
			set(STORAGE_KEYS.accessToken, state.accessToken),
			set(STORAGE_KEYS.refreshToken, state.refreshToken),
			set(STORAGE_KEYS.isAuthenticated, state.isAuthenticated),
		]);
	} catch (error) {
		console.error("Failed to persist auth state:", error);
	}
};

/**
 * Create an auth store with RPC client integration
 * @param client - The Hono RPC client
 * @param keyStore - The key store for managing cryptographic keys
 * @returns Auth store instance with methods
 */
export const createAuthStore = (client: Client, keyStore: KeyStore) => {
	const store = new Store<AuthState>(initialState);

	// Subscribe to store changes and persist to IndexedDB
	store.subscribe(() => {
		persistState(store.state);
	});

	/**
	 * Load persisted state from IndexedDB
	 */
	const load = async () => {
		const persistedState = await loadPersistedState();
		store.setState({
			...store.state,
			...persistedState,
		});
	};

	/**
	 * Sign up a new user
	 * Generates vaultKey and masterKey via keyStore
	 */
	const signUp = async (email: string, password: string) => {
		store.setState((s) => ({ ...s, isLoading: true, error: null }));

		try {
			// Generate all crypto keys via keyStore
			const { encryptedMasterKey } = await keyStore.generateKeys();

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
	 * Password-only sign-in. If a vaultKey is already stored locally,
	 * this will auto-unlock the vault; otherwise the vault remains locked
	 * until the user provides their vaultKey when accessing encrypted data.
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

				// Auto-unlock vault if we already have a stored vaultKey
				const storedVaultKey = keyStore.getVaultKey();
				if (storedVaultKey) {
					try {
						await keyStore.unlockVault(
							responseData.user.encryptedMasterKey,
							storedVaultKey,
						);
					} catch (unlockError) {
						// Do not fail auth if vault unlock fails; clear local keys instead.
						console.warn("Failed to auto-unlock vault:", unlockError);
						keyStore.clear();
					}
				}

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

		// Clear keys via keyStore
		keyStore.clear();
	};

	/**
	 * Get the current access token (useful for making authenticated requests)
	 */
	const getAccessToken = () => store.state.accessToken;

	/**
	 * Unlock the vault using a user-provided vaultKey.
	 * This is required to access encrypted documents on new devices.
	 */
	const unlockVault = async (vaultKey: string) => {
		if (keyStore.isUnlocked()) {
			throw new Error("Vault is already unlocked");
		}
		const encryptedMasterKey = store.state.user?.encryptedMasterKey;
		if (!encryptedMasterKey) {
			throw new Error("No encrypted master key available");
		}

		store.setState((s) => ({ ...s, isLoading: true, error: null }));
		try {
			await keyStore.unlockVault(encryptedMasterKey, vaultKey);
			store.setState((s) => ({ ...s, isLoading: false, error: null }));
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Vault unlock failed";
			store.setState((s) => ({
				...s,
				isLoading: false,
				error: errorMessage,
			}));
			throw error;
		}
	};

	/**
	 * Check if the vault is currently unlocked.
	 */
	const isVaultUnlocked = () => keyStore.isUnlocked();

	return {
		store,
		load,
		signUp,
		signIn,
		refresh,
		signOut,
		getAccessToken,
		unlockVault,
		isVaultUnlocked,
	};
};

export type AuthStore = ReturnType<typeof createAuthStore>;
