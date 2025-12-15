export type KvKey = readonly (string | number | boolean)[];

export interface KvEntry<T = unknown> {
  key: KvKey;
  value: T;
}

export interface KvEntryMaybe<T = unknown> {
  key: KvKey;
  value: T | null;
}

export interface KvListSelector {
  prefix?: KvKey;
  start?: KvKey;
  end?: KvKey;
}

export interface KvListOptions {
  limit?: number;
  reverse?: boolean;
}

export interface KvListIterator<T> extends AsyncIterableIterator<KvEntry<T>> {
  [Symbol.asyncIterator](): KvListIterator<T>;
}

export interface KV {
  get<T = unknown>(key: KvKey): Promise<KvEntryMaybe<T>>;
  getMany<T extends readonly unknown[]>(
    keys: readonly [...{ [K in keyof T]: KvKey }],
  ): Promise<{ [K in keyof T]: KvEntryMaybe<T[K]> }>;
  set(key: KvKey, value: unknown): Promise<void>;
  delete(key: KvKey): Promise<void>;
  list<T = unknown>(
    selector: KvListSelector,
    options?: KvListOptions,
  ): KvListIterator<T>;
  transaction<T>(fn: (tx: KV) => Promise<T>): Promise<T>;
  close(): void;
}
