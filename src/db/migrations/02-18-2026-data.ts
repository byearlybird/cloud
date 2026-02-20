import { type Kysely, type Migration } from "kysely";

export const Migration20260218Data: Migration = {
  async up(db: Kysely<any>) {
    await db.schema
      .createTable("data")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("vault_address", "text", (col) => col.notNull().references("vault.address"))
      .addColumn("type", "text", (col) => col.notNull())
      .addColumn("enc_data", "text", (col) => col.notNull())
      .addColumn("timestamp", "text", (col) => col.notNull())
      .addUniqueConstraint("data_vault_address_type_unique", ["vault_address", "type"])
      .execute();
  },
  async down(db: Kysely<any>) {
    await db.schema.dropTable("data").execute();
  },
};
