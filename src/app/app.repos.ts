import { db, kv } from "@/db";
import { createDocumentRepo } from "@/modules/document/document.repo";
import { createTokenRepo } from "@/modules/token/token.repo";
import { createUserRepo } from "@/modules/user/user.repo";

// Tokens still use Drizzle
export const tokenRepo = createTokenRepo(db);

// Users and documents now use KV store
export const userRepo = createUserRepo(kv);
export const documentRepo = createDocumentRepo(kv);
