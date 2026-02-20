import { dataRepo } from "../repos/data-repo";

export const syncService = {
  getData: async (
    address: string,
    type: string,
  ): Promise<{ status: "success"; enc_data: string } | { status: "not_found" }> => {
    const row = await dataRepo.getByAddressAndType(address, type);
    if (!row) {
      return { status: "not_found" };
    }
    return { status: "success", enc_data: row.enc_data };
  },
  putData: async (address: string, type: string, enc_data: string): Promise<void> => {
    await dataRepo.upsert(address, type, enc_data);
  },
};
