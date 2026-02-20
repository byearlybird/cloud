import { DataRepo } from "../repos/data-repo";

export class SyncService {
  #dataRepo: DataRepo;
  constructor(dataRepo: DataRepo) {
    this.#dataRepo = dataRepo;
  }

  async getData(
    address: string,
    type: string,
  ): Promise<{ status: "success"; enc_data: string } | { status: "not_found" }> {
    const row = await this.#dataRepo.getByAddressAndType(address, type);
    if (!row) return { status: "not_found" };
    return { status: "success", enc_data: row.enc_data };
  }

  async putData(address: string, type: string, enc_data: string): Promise<void> {
    await this.#dataRepo.upsert(address, type, enc_data);
  }
}
