import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createKV } from "./kv";

describe("KV Store", () => {
  let kv: ReturnType<typeof createKV>;

  beforeEach(() => {
    const db = new Database(":memory:");
    kv = createKV(db);
  });

  describe("get/set", () => {
    test("should set and get a value", async () => {
      await kv.set(["users", "alice"], { name: "Alice" });
      const result = await kv.get(["users", "alice"]);

      expect(result.key).toEqual(["users", "alice"]);
      expect(result.value).toEqual({ name: "Alice" });
    });

    test("should return null for missing key", async () => {
      const result = await kv.get(["users", "bob"]);

      expect(result.key).toEqual(["users", "bob"]);
      expect(result.value).toBeNull();
    });

    test("should overwrite existing value", async () => {
      await kv.set(["users", "alice"], { name: "Alice" });
      await kv.set(["users", "alice"], { name: "Alice Smith" });

      const result = await kv.get(["users", "alice"]);
      expect(result.value).toEqual({ name: "Alice Smith" });
    });

    test("should handle different value types", async () => {
      await kv.set(["string"], "hello");
      await kv.set(["number"], 42);
      await kv.set(["boolean"], true);
      await kv.set(["array"], [1, 2, 3]);
      await kv.set(["object"], { foo: "bar" });

      expect((await kv.get(["string"])).value).toBe("hello");
      expect((await kv.get(["number"])).value).toBe(42);
      expect((await kv.get(["boolean"])).value).toBe(true);
      expect((await kv.get(["array"])).value).toEqual([1, 2, 3]);
      expect((await kv.get(["object"])).value).toEqual({ foo: "bar" });
    });

    test("should handle keys with numbers and booleans", async () => {
      await kv.set(["users", 123], { id: 123 });
      await kv.set(["flags", true], { enabled: true });

      expect((await kv.get(["users", 123])).value).toEqual({ id: 123 });
      expect((await kv.get(["flags", true])).value).toEqual({ enabled: true });
    });
  });

  describe("getMany", () => {
    test("should get multiple values", async () => {
      await kv.set(["users", "alice"], { name: "Alice" });
      await kv.set(["users", "bob"], { name: "Bob" });

      const results = await kv.getMany([
        ["users", "alice"],
        ["users", "bob"],
        ["users", "charlie"], // doesn't exist
      ]);

      expect(results[0].value).toEqual({ name: "Alice" });
      expect(results[1].value).toEqual({ name: "Bob" });
      expect(results[2].value).toBeNull();
    });

    test("should maintain order of requested keys", async () => {
      await kv.set(["a"], 1);
      await kv.set(["b"], 2);
      await kv.set(["c"], 3);

      const results = await kv.getMany([["c"], ["a"], ["b"]]);

      expect(results[0].key).toEqual(["c"]);
      expect(results[0].value).toBe(3);
      expect(results[1].key).toEqual(["a"]);
      expect(results[1].value).toBe(1);
      expect(results[2].key).toEqual(["b"]);
      expect(results[2].value).toBe(2);
    });

    test("should handle empty array", async () => {
      const results = await kv.getMany([]);
      expect(results).toEqual([]);
    });
  });

  describe("delete", () => {
    test("should delete a value", async () => {
      await kv.set(["users", "alice"], { name: "Alice" });
      await kv.delete(["users", "alice"]);

      const result = await kv.get(["users", "alice"]);
      expect(result.value).toBeNull();
    });

    test("should be no-op for missing key", async () => {
      await kv.delete(["users", "bob"]); // Should not throw
    });

    test("should allow re-setting after delete", async () => {
      await kv.set(["users", "alice"], { name: "Alice" });
      await kv.delete(["users", "alice"]);
      await kv.set(["users", "alice"], { name: "Alice New" });

      const result = await kv.get(["users", "alice"]);
      expect(result.value).toEqual({ name: "Alice New" });
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await kv.set(["users", "alice"], { name: "Alice" });
      await kv.set(["users", "bob"], { name: "Bob" });
      await kv.set(["users", "charlie"], { name: "Charlie" });
      await kv.set(["posts", "1"], { title: "Post 1" });
    });

    test("should list by prefix", async () => {
      const entries = [];
      for await (const entry of kv.list({ prefix: ["users"] })) {
        entries.push(entry);
      }

      expect(entries).toHaveLength(3);
      expect(entries[0].key).toEqual(["users", "alice"]);
      expect(entries[1].key).toEqual(["users", "bob"]);
      expect(entries[2].key).toEqual(["users", "charlie"]);
    });

    test("should list with limit", async () => {
      const entries = [];
      for await (const entry of kv.list(
        { prefix: ["users"] },
        { limit: 2 },
      )) {
        entries.push(entry);
      }

      expect(entries).toHaveLength(2);
      expect(entries[0].key).toEqual(["users", "alice"]);
      expect(entries[1].key).toEqual(["users", "bob"]);
    });

    test("should list in reverse", async () => {
      const entries = [];
      for await (const entry of kv.list(
        { prefix: ["users"] },
        { reverse: true },
      )) {
        entries.push(entry);
      }

      expect(entries[0].key).toEqual(["users", "charlie"]);
      expect(entries[1].key).toEqual(["users", "bob"]);
      expect(entries[2].key).toEqual(["users", "alice"]);
    });

    test("should list by range", async () => {
      const entries = [];
      for await (const entry of kv.list({
        start: ["users", "alice"],
        end: ["users", "charlie"],
      })) {
        entries.push(entry);
      }

      expect(entries).toHaveLength(2); // alice and bob (charlie excluded)
      expect(entries[0].key).toEqual(["users", "alice"]);
      expect(entries[1].key).toEqual(["users", "bob"]);
    });

    test("should return empty iterator for non-matching prefix", async () => {
      const entries = [];
      for await (const entry of kv.list({ prefix: ["nonexistent"] })) {
        entries.push(entry);
      }

      expect(entries).toHaveLength(0);
    });

    test("should handle nested prefixes", async () => {
      await kv.set(["docs", "user1", "file1"], { data: "a" });
      await kv.set(["docs", "user1", "file2"], { data: "b" });
      await kv.set(["docs", "user2", "file1"], { data: "c" });

      const entries = [];
      for await (const entry of kv.list({ prefix: ["docs", "user1"] })) {
        entries.push(entry);
      }

      expect(entries).toHaveLength(2);
      expect(entries[0].key).toEqual(["docs", "user1", "file1"]);
      expect(entries[1].key).toEqual(["docs", "user1", "file2"]);
    });

    test("should throw error if selector has neither prefix nor range", async () => {
      expect(() => {
        kv.list({});
      }).toThrow("Selector must specify either 'prefix' or both 'start' and 'end'");
    });

    test("should throw error if selector has only start", async () => {
      expect(() => {
        kv.list({ start: ["users", "a"] });
      }).toThrow("Selector must specify either 'prefix' or both 'start' and 'end'");
    });
  });

  describe("edge cases", () => {
    test("should handle empty key array", async () => {
      await kv.set([], { root: true });
      const result = await kv.get([]);
      expect(result.value).toEqual({ root: true });
    });

    test("should handle single element keys", async () => {
      await kv.set(["single"], { value: "test" });
      const result = await kv.get(["single"]);
      expect(result.value).toEqual({ value: "test" });
    });

    test("should handle long key arrays", async () => {
      const longKey = ["a", "b", "c", "d", "e", "f", "g"];
      await kv.set(longKey, { deep: true });
      const result = await kv.get(longKey);
      expect(result.value).toEqual({ deep: true });
    });

    test("should handle null values", async () => {
      await kv.set(["null"], null);
      const result = await kv.get(["null"]);
      expect(result.value).toBeNull();
    });

    test("should distinguish between missing key and null value", async () => {
      await kv.set(["exists"], null);
      const existsResult = await kv.get(["exists"]);
      const missingResult = await kv.get(["missing"]);

      // Both return null, but key exists in one case
      expect(existsResult.value).toBeNull();
      expect(missingResult.value).toBeNull();

      // Can verify by deleting and checking again
      await kv.delete(["exists"]);
      const afterDelete = await kv.get(["exists"]);
      expect(afterDelete.value).toBeNull();
    });
  });

  describe("transactions", () => {
    test("should commit transaction on success", async () => {
      const result = await kv.transaction(async (tx) => {
        await tx.set(["users", "alice"], { balance: 100 });
        await tx.set(["users", "bob"], { balance: 50 });
        return "success";
      });

      expect(result).toBe("success");

      const alice = await kv.get(["users", "alice"]);
      const bob = await kv.get(["users", "bob"]);
      expect(alice.value).toEqual({ balance: 100 });
      expect(bob.value).toEqual({ balance: 50 });
    });

    test("should rollback transaction on error", async () => {
      await kv.set(["counter"], 0);

      try {
        await kv.transaction(async (tx) => {
          await tx.set(["counter"], 10);
          await tx.set(["users", "alice"], { balance: 100 });
          throw new Error("Something went wrong");
        });
      } catch (error: any) {
        expect(error.message).toBe("Something went wrong");
      }

      // Changes should be rolled back
      const counter = await kv.get(["counter"]);
      const alice = await kv.get(["users", "alice"]);
      expect(counter.value).toBe(0);
      expect(alice.value).toBeNull();
    });

    test("should support reading within transaction", async () => {
      await kv.set(["account", "balance"], 100);

      await kv.transaction(async (tx) => {
        const current = await tx.get<number>(["account", "balance"]);
        await tx.set(["account", "balance"], (current.value || 0) + 50);
      });

      const result = await kv.get(["account", "balance"]);
      expect(result.value).toBe(150);
    });

    test("should support delete within transaction", async () => {
      await kv.set(["temp", "data"], "value");

      await kv.transaction(async (tx) => {
        await tx.set(["new", "data"], "new");
        await tx.delete(["temp", "data"]);
      });

      const temp = await kv.get(["temp", "data"]);
      const newData = await kv.get(["new", "data"]);
      expect(temp.value).toBeNull();
      expect(newData.value).toBe("new");
    });

    test("should support list within transaction", async () => {
      await kv.set(["items", "1"], { id: 1 });
      await kv.set(["items", "2"], { id: 2 });

      const ids = await kv.transaction(async (tx) => {
        const items = [];
        for await (const entry of tx.list({ prefix: ["items"] })) {
          items.push(entry.value);
        }
        return items;
      });

      expect(ids).toHaveLength(2);
      expect(ids[0]).toEqual({ id: 1 });
      expect(ids[1]).toEqual({ id: 2 });
    });

    test("should support getMany within transaction", async () => {
      await kv.set(["a"], 1);
      await kv.set(["b"], 2);

      await kv.transaction(async (tx) => {
        const results = await tx.getMany([["a"], ["b"]]);
        const sum = (results[0].value as number) + (results[1].value as number);
        await tx.set(["sum"], sum);
      });

      const result = await kv.get(["sum"]);
      expect(result.value).toBe(3);
    });

    test("should isolate transaction failures", async () => {
      await kv.set(["shared"], "initial");

      // First transaction succeeds
      await kv.transaction(async (tx) => {
        await tx.set(["shared"], "tx1");
      });

      // Second transaction fails
      try {
        await kv.transaction(async (tx) => {
          await tx.set(["shared"], "tx2");
          throw new Error("fail");
        });
      } catch {
        // Expected
      }

      // Only first transaction should be committed
      const result = await kv.get(["shared"]);
      expect(result.value).toBe("tx1");
    });

    test("should throw error if trying to close within transaction", async () => {
      await expect(
        kv.transaction(async (tx) => {
          tx.close();
        })
      ).rejects.toThrow("Cannot close database within a transaction");
    });

    test("should support nested transactions (savepoints)", async () => {
      await kv.set(["counter"], 0);

      await kv.transaction(async (tx1) => {
        await tx1.set(["counter"], 10);

        await tx1.transaction(async (tx2) => {
          await tx2.set(["counter"], 20);
        });

        const result = await tx1.get(["counter"]);
        expect(result.value).toBe(20);
      });

      const finalResult = await kv.get(["counter"]);
      expect(finalResult.value).toBe(20);
    });

    test("should rollback nested transaction on error", async () => {
      await kv.set(["counter"], 0);

      try {
        await kv.transaction(async (tx1) => {
          await tx1.set(["counter"], 10);

          await tx1.transaction(async (tx2) => {
            await tx2.set(["counter"], 20);
            throw new Error("inner error");
          });
        });
      } catch (error: any) {
        expect(error.message).toBe("inner error");
      }

      // Entire transaction should be rolled back
      const result = await kv.get(["counter"]);
      expect(result.value).toBe(0);
    });
  });
});
