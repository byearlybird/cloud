import { db } from "@/db";
import { createBlobRepo } from "@/modules/blob/blob.repo";
import { createTokenRepo } from "@/modules/token/token.repo";
import { createUserRepo } from "@/modules/user/user.repo";

export const userRepo = createUserRepo(db);
export const tokenRepo = createTokenRepo(db);
export const blobRepo = createBlobRepo(db);
