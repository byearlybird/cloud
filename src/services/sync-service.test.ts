import { describe, expect, it } from "bun:test";
import { SyncService } from "./sync-service";
import type { DataRepo } from "../repos/data-repo";
import type { Data } from "../db/schema";

function makeDataRepo(row?: Data) {
  return {
    getByAddressAndType: async (_address: string, _type: string) => row,
    upsert: async (_address: string, _type: string, _enc_data: string) => {},
  } satisfies DataRepo;
}

function makeRow(enc_data = "encrypted"): Data {
  return { id: "1", address: "abc", type: "notes", enc_data, timestamp: new Date().toISOString() };
}

describe("SyncService.getData", () => {
  it("returns not_found when no row exists", async () => {
    const service = new SyncService(makeDataRepo(undefined));
    const result = await service.getData("abc", "notes");
    expect(result.status).toBe("not_found");
  });

  it("returns success with enc_data when row exists", async () => {
    const row = makeRow("my-encrypted-data");
    const service = new SyncService(makeDataRepo(row));
    const result = await service.getData("abc", "notes");
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.enc_data).toBe("my-encrypted-data");
    }
  });
});

describe("SyncService.putData", () => {
  it("calls upsert without throwing", async () => {
    const service = new SyncService(makeDataRepo());
    await expect(service.putData("abc", "notes", "encrypted")).resolves.toBeUndefined();
  });
});
