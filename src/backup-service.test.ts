import { describe, expect, it } from "bun:test";
import { BackupService } from "./backup-service";
import type { BackupRepo } from "./backup-repo";
import type { Backup } from "./db/schema";

function makeBackupRepo(row?: Backup) {
  return {
    getByUserId: async (_userId: string) => row,
    upsert: async (_userId: string, _data: string) => {},
  } satisfies BackupRepo;
}

function makeRow(data = "encrypted"): Backup {
  const now = new Date().toISOString();
  return { id: "1", user_id: "user_abc", data, created_at: now, updated_at: now };
}

describe("BackupService.getData", () => {
  it("returns not_found when no row exists", async () => {
    const service = new BackupService(makeBackupRepo(undefined));
    const result = await service.getData("user_abc");
    expect(result.status).toBe("not_found");
  });

  it("returns success with data when row exists", async () => {
    const row = makeRow("my-data");
    const service = new BackupService(makeBackupRepo(row));
    const result = await service.getData("user_abc");
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data).toBe("my-data");
    }
  });
});

describe("BackupService.putData", () => {
  it("calls upsert without throwing", async () => {
    const service = new BackupService(makeBackupRepo());
    await expect(service.putData("user_abc", "encrypted")).resolves.toBeUndefined();
  });
});
