import { beforeEach, describe, expect, test } from "bun:test";
import { createKV, type KVStore } from "./kv";

describe("createKV", () => {
	let kv: KVStore;

	beforeEach(() => {
		kv = createKV(); // in-memory for tests
	});

	describe("get", () => {
		test("returns null for non-existent key", () => {
			const result = kv.get(["users", "123"]);
			expect(result).toBeNull();
		});

		test("retrieves stored value", () => {
			kv.set(["users", "123"], { name: "Alice" });
			const result = kv.get(["users", "123"]);
			expect(result).toEqual({ name: "Alice" });
		});

		test("handles single-element key arrays", () => {
			kv.set(["config"], { theme: "dark" });
			const result = kv.get(["config"]);
			expect(result).toEqual({ theme: "dark" });
		});

		test("handles multi-element key arrays", () => {
			kv.set(["users", "123", "profile", "settings"], { notifications: true });
			const result = kv.get(["users", "123", "profile", "settings"]);
			expect(result).toEqual({
				notifications: true,
			});
		});

		test("throws error for empty key array", () => {
			expect(() => kv.get([])).toThrow("Key must be a non-empty array");
		});

		test("returns null for different key path", () => {
			kv.set(["users", "123"], { name: "Alice" });
			expect(kv.get<any>(["users", "456"])).toBeNull();
		});

		test("handles keys with special characters", () => {
			kv.set(["users", "test@example.com"], { verified: true });
			expect(kv.get<any>(["users", "test@example.com"])).toEqual({
				verified: true,
			});
		});

		test("handles keys with forward slashes in segments", () => {
			kv.set(["paths", "a/b", "c"], { data: "test" });
			expect(kv.get<any>(["paths", "a/b", "c"])).toEqual({ data: "test" });
		});
	});

	describe("set", () => {
		test("stores string values", () => {
			kv.set(["greeting"], "Hello, World!");
			expect(kv.get<any>(["greeting"])).toBe("Hello, World!");
		});

		test("stores number values", () => {
			kv.set(["counter"], 42);
			expect(kv.get<any>(["counter"])).toBe(42);
		});

		test("stores boolean values", () => {
			kv.set(["enabled"], true);
			expect(kv.get<any>(["enabled"])).toBe(true);
		});

		test("stores null values", () => {
			kv.set(["nullable"], null);
			expect(kv.get<any>(["nullable"])).toBeNull();
		});

		test("stores undefined as null", () => {
			kv.set(["undefined"], undefined);
			expect(kv.get<any>(["undefined"])).toBeNull();
		});

		test("stores object values", () => {
			const obj = { name: "Alice", age: 30 };
			kv.set(["user"], obj);
			expect(kv.get<any>(["user"])).toEqual(obj);
		});

		test("stores array values", () => {
			const arr = [1, 2, 3, 4, 5];
			kv.set(["numbers"], arr);
			expect(kv.get<any>(["numbers"])).toEqual(arr);
		});

		test("stores nested objects", () => {
			const nested = {
				user: {
					profile: {
						settings: {
							notifications: true,
						},
					},
				},
			};
			kv.set(["config"], nested);
			expect(kv.get<any>(["config"])).toEqual(nested);
		});

		test("updates existing values (upsert)", () => {
			kv.set(["counter"], 1);
			kv.set(["counter"], 2);
			expect(kv.get<any>(["counter"])).toBe(2);
		});

		test("updates existing object values", () => {
			kv.set(["user"], { name: "Alice" });
			kv.set(["user"], { name: "Bob", age: 25 });
			expect(kv.get<any>(["user"])).toEqual({ name: "Bob", age: 25 });
		});

		test("throws error for empty key array", () => {
			expect(() => kv.set([], "value")).toThrow(
				"Key must be a non-empty array",
			);
		});

		test("throws error for circular references", () => {
			const circular: any = { a: 1 };
			circular.self = circular;
			expect(() => kv.set(["circular"], circular)).toThrow(
				"Failed to serialize value",
			);
		});
	});

	describe("multiple operations", () => {
		test("handles multiple independent keys", () => {
			kv.set(["user", "1"], { name: "Alice" });
			kv.set(["user", "2"], { name: "Bob" });
			kv.set(["config", "theme"], "dark");

			expect(kv.get<any>(["user", "1"])).toEqual({ name: "Alice" });
			expect(kv.get<any>(["user", "2"])).toEqual({ name: "Bob" });
			expect(kv.get<any>(["config", "theme"])).toBe("dark");
		});

		test("maintains data isolation between keys", () => {
			kv.set(["users"], [1, 2, 3]);
			kv.set(["users", "123"], { name: "Alice" });

			expect(kv.get<any>(["users"])).toEqual([1, 2, 3]);
			expect(kv.get<any>(["users", "123"])).toEqual({ name: "Alice" });
		});

		test("handles rapid successive updates", () => {
			for (let i = 0; i < 100; i++) {
				kv.set(["counter"], i);
			}
			expect(kv.get<any>(["counter"])).toBe(99);
		});
	});

	describe("edge cases", () => {
		test("handles empty strings in key array", () => {
			kv.set(["", "key"], "value");
			expect(kv.get<any>(["", "key"])).toBe("value");
		});

		test("handles empty string values", () => {
			kv.set(["empty"], "");
			expect(kv.get<any>(["empty"])).toBe("");
		});

		test("handles large objects", () => {
			const large = { data: new Array(1000).fill({ test: "value" }) };
			kv.set(["large"], large);
			expect(kv.get<any>(["large"])).toEqual(large);
		});

		test("handles special JSON values", () => {
			kv.set(["zero"], 0);
			kv.set(["false"], false);
			kv.set(["empty-array"], []);
			kv.set(["empty-object"], {});

			expect(kv.get<any>(["zero"])).toBe(0);
			expect(kv.get<any>(["false"])).toBe(false);
			expect(kv.get<any>(["empty-array"])).toEqual([]);
			expect(kv.get<any>(["empty-object"])).toEqual({});
		});
	});

	describe("close", () => {
		test("closes database without error", () => {
			expect(() => kv.close()).not.toThrow();
		});
	});

	describe("persistent database", () => {
		test("persists data to file", () => {
			const dbPath = "/tmp/test-kv.db";

			// Create and populate database
			const kv1 = createKV(dbPath);
			kv1.set(["test"], "persisted");
			kv1.close();

			// Reopen and verify data persists
			const kv2 = createKV(dbPath);
			expect(kv2.get<any>(["test"])).toBe("persisted");
			kv2.close();

			// Cleanup
			Bun.file(dbPath).unlink();
		});
	});
});
