import type { Migration } from "kysely";
import { Migration20260217Init } from "./02-17-2026-init";
import { Migration20260218Data } from "./02-18-2026-data";

export const migrations: Record<string, Migration> = {
  "2026-02-17-init": Migration20260217Init,
  "2026-02-18-data": Migration20260218Data,
};
