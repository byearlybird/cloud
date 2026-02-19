import { type Kysely, type Migration } from "kysely";

export const Migration20260217Init: Migration = {
  async up(db: Kysely<any>) {
    await db.schema
      .createTable("vault")
      .addColumn("address", "text", (col) => col.primaryKey())
      .addColumn("public_key", "text", (col) => col.notNull())
      .addColumn("created_at", "text", (col) => col.notNull())
      .execute();

    await db.schema
      .createTable("challenges")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("vault_address", "text", (col) => col.notNull())
      .addColumn("challenge", "text", (col) => col.notNull())
      .addColumn("expires_at", "text", (col) => col.notNull())
      .execute();
  },
  async down(db: Kysely<any>) {
    await db.schema.dropTable("challenges").execute();
    await db.schema.dropTable("vault").execute();
  },
};
