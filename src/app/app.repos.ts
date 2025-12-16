import { db, kv } from "@/db";
import { createDocumentRepo } from "@/modules/document/document.repo";
import { createTokenRepo } from "@/modules/token/token.repo";
import { createUserRepo } from "@/modules/user/user.repo";

// Users and tokens still use Drizzle
export const userRepo = createUserRepo(db);
export const tokenRepo = createTokenRepo(db);

// Documents now use KV store
export const documentRepo = createDocumentRepo(kv);
