import type { KvKey } from "./kv-types";

// Use Unit Separator (ASCII 31) instead of null byte
// Null byte doesn't work correctly with SQLite LIKE operator
const SEPARATOR = "\x1F"; // Unit Separator for lexicographic ordering

export function serializeKey(key: KvKey): string {
	return key
		.map((part) => {
			// Convert to string and escape separators
			const str = String(part);
			if (str.includes(SEPARATOR)) {
				throw new Error(`Key part cannot contain separator: ${str}`);
			}
			return str;
		})
		.join(SEPARATOR);
}

export function deserializeKey(keyStr: string): KvKey {
	return keyStr.split(SEPARATOR);
}

// For prefix matching
export function keyPrefixPattern(prefix: KvKey): string {
	const prefixStr = serializeKey(prefix);
	return `${prefixStr}${SEPARATOR}%`;
}

// For range queries
export function keyRangeStart(key: KvKey): string {
	return serializeKey(key);
}

export function keyRangeEnd(key: KvKey): string {
	// End is exclusive, so we don't need special handling
	return serializeKey(key);
}

// Export separator for use in list operations
export { SEPARATOR };
