import { type Kysely, type Migration } from "kysely";

export const Migration20260218Data: Migration = {
  async up(db: Kysely<any>) {
    await db.schema
      .createTable("data")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("type", "text", (col) => col.notNull())
      .addColumn("enc_data", "text", (col) => col.notNull())
      .addColumn("timestamp", "text", (col) => col.notNull())
      .addColumn("address", "text", (col) => col.notNull())
      .execute();
  },
  async down(db: Kysely<any>) {
    await db.schema.dropTable("data").execute();
  },
};
