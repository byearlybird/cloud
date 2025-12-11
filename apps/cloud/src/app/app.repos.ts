import { db } from "@/db";
import { createDocumentRepo } from "@/modules/document/document.repo";
import { createTokenRepo } from "@/modules/token/token.repo";
import { createUserRepo } from "@/modules/user/user.repo";

export const userRepo = createUserRepo(db);
export const tokenRepo = createTokenRepo(db);
export const documentRepo = createDocumentRepo(db);
