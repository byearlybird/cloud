import {
	generateKeys as cryptoGenerateKeys,
	decryptMasterKey,
} from "@byearlybird/crypto";
import { Store } from "@tanstack/store";
import { get, set } from "idb-keyval";

/**
 * Key state shape
 */
export type KeyState = {
	masterKey: CryptoKey | null;
	vaultKey: string | null;
};

/**
 * Initial key state
 */
const initialState: KeyState = {
	masterKey: null,
	vaultKey: null,
};

/**
 * IndexedDB storage keys
 */
const STORAGE_KEYS = {
	vaultKey: "keys:vaultKey",
	masterKey: "keys:masterKey",
} as const;

/**
 * Load persisted key state from IndexedDB
 */
const loadPersistedState = async (): Promise<Partial<KeyState>> => {
	try {
		const [vaultKey, masterKey] = await Promise.all([
			get(STORAGE_KEYS.vaultKey),
			get(STORAGE_KEYS.masterKey),
		]);

		return {
			vaultKey: vaultKey ?? null,
			masterKey: masterKey ?? null,
		};
	} catch (error) {
		console.error("Failed to load key state:", error);
		return {};
	}
};

/**
 * Persist key state to IndexedDB
 */
const persistState = async (state: KeyState) => {
	try {
		await Promise.all([
			set(STORAGE_KEYS.vaultKey, state.vaultKey),
			set(STORAGE_KEYS.masterKey, state.masterKey),
		]);
	} catch (error) {
		console.error("Failed to persist key state:", error);
	}
};

/**
 * Create a key store for managing cryptographic keys
 * @returns Key store instance with methods
 */
export const createKeyStore = () => {
	const store = new Store<KeyState>(initialState);

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
	 * Generate new vault key and master key
	 * @returns Object containing vaultKey, masterKey, and encryptedMasterKey
	 * @throws Error if key generation fails
	 */
	const generateKeys = async () => {
		const { vaultKey, masterKey, encryptedMasterKey } =
			await cryptoGenerateKeys();

		store.setState({
			vaultKey,
			masterKey,
		});

		return { vaultKey, masterKey, encryptedMasterKey };
	};

	/**
	 * Unlock the vault by decrypting masterKey from encryptedMasterKey using vaultKey
	 * @param encryptedMasterKey - The encrypted master key from the server
	 * @param vaultKey - The user's vault key
	 * @throws Error if decryption fails (wrong vault key)
	 */
	const unlockVault = async (encryptedMasterKey: string, vaultKey: string) => {
		try {
			const masterKey = await decryptMasterKey(encryptedMasterKey, vaultKey);

			store.setState({
				masterKey,
				vaultKey,
			});
		} catch (error) {
			throw new Error("Invalid vault key - unable to decrypt master key");
		}
	};

	/**
	 * Clear all keys from state and storage
	 */
	const clear = () => {
		store.setState(initialState);
	};

	/**
	 * Get the current vault key
	 */
	const getVaultKey = () => store.state.vaultKey;

	/**
	 * Get the current master key
	 */
	const getMasterKey = () => store.state.masterKey;

	/**
	 * Check if vault is unlocked (masterKey is available)
	 */
	const isUnlocked = () => store.state.masterKey !== null;

	return {
		store,
		load,
		generateKeys,
		unlockVault,
		clear,
		getVaultKey,
		getMasterKey,
		isUnlocked,
	};
};

export type KeyStore = ReturnType<typeof createKeyStore>;
