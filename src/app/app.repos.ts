import { kv } from "@/db";
import { createDocumentRepo } from "@/modules/document/document.repo";
import { createTokenRepo } from "@/modules/token/token.repo";
import { createUserRepo } from "@/modules/user/user.repo";

// All repos now use KV store
export const tokenRepo = createTokenRepo(kv);
export const userRepo = createUserRepo(kv);
export const documentRepo = createDocumentRepo(kv);
