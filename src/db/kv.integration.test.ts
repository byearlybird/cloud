import { describe, test, expect, afterEach } from "bun:test";
import { createKV } from "./kv";
import { unlink } from "node:fs/promises";

describe("KV Integration", () => {
  const testDbPath = "/tmp/test-kv.db";

  afterEach(async () => {
    try {
      await unlink(testDbPath);
    } catch {
      // File might not exist, that's ok
    }
  });

  test("should persist to file", async () => {
    // Write
    const kv1 = createKV(testDbPath);
    await kv1.set(["foo"], "bar");
    await kv1.set(["nested", "key"], { data: "value" });
    kv1.close();

    // Read
    const kv2 = createKV(testDbPath);
    const result1 = await kv2.get(["foo"]);
    const result2 = await kv2.get(["nested", "key"]);
    expect(result1.value).toBe("bar");
    expect(result2.value).toEqual({ data: "value" });
    kv2.close();
  });

  test("should handle concurrent operations", async () => {
    const kv = createKV(":memory:");

    // Concurrent sets
    await Promise.all([
      kv.set(["a"], 1),
      kv.set(["b"], 2),
      kv.set(["c"], 3),
    ]);

    // Concurrent gets
    const results = await Promise.all([
      kv.get(["a"]),
      kv.get(["b"]),
      kv.get(["c"]),
    ]);

    expect(results[0].value).toBe(1);
    expect(results[1].value).toBe(2);
    expect(results[2].value).toBe(3);
  });

  test("should handle updates and deletes concurrently", async () => {
    const kv = createKV(":memory:");

    // Setup initial data
    await kv.set(["item1"], "value1");
    await kv.set(["item2"], "value2");
    await kv.set(["item3"], "value3");

    // Concurrent operations
    await Promise.all([
      kv.set(["item1"], "updated1"),
      kv.delete(["item2"]),
      kv.set(["item4"], "value4"),
    ]);

    const results = await kv.getMany([
      ["item1"],
      ["item2"],
      ["item3"],
      ["item4"],
    ]);

    expect(results[0].value).toBe("updated1");
    expect(results[1].value).toBeNull();
    expect(results[2].value).toBe("value3");
    expect(results[3].value).toBe("value4");
  });

  test("should handle large datasets", async () => {
    const kv = createKV(":memory:");

    // Insert 1000 items
    const insertPromises = [];
    for (let i = 0; i < 1000; i++) {
      insertPromises.push(kv.set(["items", i], { index: i, data: `item${i}` }));
    }
    await Promise.all(insertPromises);

    // List all items
    const entries = [];
    for await (const entry of kv.list({ prefix: ["items"] })) {
      entries.push(entry);
    }

    expect(entries).toHaveLength(1000);
    expect(entries[0].value).toEqual({ index: 0, data: "item0" });
    expect(entries[999].value).toEqual({ index: 999, data: "item999" });
  });

  test("should handle list with limit on large dataset", async () => {
    const kv = createKV(":memory:");

    // Insert 100 items
    for (let i = 0; i < 100; i++) {
      await kv.set(["items", i], i);
    }

    // Get first 10
    const entries = [];
    for await (const entry of kv.list({ prefix: ["items"] }, { limit: 10 })) {
      entries.push(entry);
    }

    expect(entries).toHaveLength(10);
  });

  test("should handle multiple namespaces", async () => {
    const kv = createKV(":memory:");

    // Create data in different namespaces
    await kv.set(["users", "1"], { name: "Alice" });
    await kv.set(["users", "2"], { name: "Bob" });
    await kv.set(["posts", "1"], { title: "Post 1" });
    await kv.set(["posts", "2"], { title: "Post 2" });
    await kv.set(["comments", "1"], { text: "Comment 1" });

    // List each namespace
    const users = [];
    for await (const entry of kv.list({ prefix: ["users"] })) {
      users.push(entry);
    }

    const posts = [];
    for await (const entry of kv.list({ prefix: ["posts"] })) {
      posts.push(entry);
    }

    const comments = [];
    for await (const entry of kv.list({ prefix: ["comments"] })) {
      comments.push(entry);
    }

    expect(users).toHaveLength(2);
    expect(posts).toHaveLength(2);
    expect(comments).toHaveLength(1);
  });

  test("should persist updates correctly", async () => {
    const kv1 = createKV(testDbPath);
    await kv1.set(["counter"], 0);
    kv1.close();

    // Increment in multiple sessions
    for (let i = 1; i <= 5; i++) {
      const kv = createKV(testDbPath);
      const current = await kv.get<number>(["counter"]);
      await kv.set(["counter"], (current.value || 0) + 1);
      kv.close();
    }

    // Verify final value
    const kvFinal = createKV(testDbPath);
    const result = await kvFinal.get<number>(["counter"]);
    expect(result.value).toBe(5);
    kvFinal.close();
  });
});
