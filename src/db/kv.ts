import { Database } from "bun:sqlite";
import type { KV } from "./kv-types";
import { initializeSchema } from "./kv-schema";
import { get, getMany, set, del, list, transaction } from "./kv-operations";

export * from "./kv-types";

export function createKV(pathOrDb?: string | Database): KV {
  const db =
    typeof pathOrDb === "string"
      ? new Database(pathOrDb)
      : pathOrDb ?? new Database(":memory:");

  initializeSchema(db);

  return {
    get: (key) => get(db, key),
    getMany: (keys) => getMany(db, keys),
    set: (key, value) => set(db, key, value),
    delete: (key) => del(db, key),
    list: (selector, options) => list(db, selector, options),
    transaction: (fn) => transaction(db, fn),
    close: () => db.close(),
  };
}
