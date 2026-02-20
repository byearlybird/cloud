import { ChallengeRepo } from "../repos/challenge-repo";
import { VaultRepo } from "../repos/vault-repo";
import { generateChallenge, makeVaultAddress, verifySignature } from "../utils/crypto";
import { sign, verify } from "hono/jwt";

const ACCESS_TOKEN_TTL = 60 * 5; // 5 minutes
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days

export class AuthService {
  #vaultRepo: VaultRepo;
  #challengeRepo: ChallengeRepo;
  #jwtSecret: string;

  constructor(vaultRepo: VaultRepo, challengeRepo: ChallengeRepo, jwtSecret: string) {
    this.#vaultRepo = vaultRepo;
    this.#challengeRepo = challengeRepo;
    this.#jwtSecret = jwtSecret;
  }

  async #issueTokenPair(address: string): Promise<{ accessToken: string; refreshToken: string }> {
    const now = Math.floor(Date.now() / 1000);
    const [accessToken, refreshToken] = await Promise.all([
      sign({ sub: address, exp: now + ACCESS_TOKEN_TTL }, this.#jwtSecret),
      sign({ sub: address, type: "refresh", exp: now + REFRESH_TOKEN_TTL }, this.#jwtSecret),
    ]);
    return { accessToken, refreshToken };
  }

  async createVault(publicKey: JsonWebKey) {
    const address = await makeVaultAddress(publicKey);
    const vault = await this.#vaultRepo.create({ address, public_key: JSON.stringify(publicKey) });
    return vault;
  }

  async getChallenge(
    address: string,
  ): Promise<
    { status: "success"; challengeId: string; challenge: string } | { status: "not_found" }
  > {
    const vault = await this.#vaultRepo.get(address);
    if (!vault) {
      return { status: "not_found" };
    }
    const { challengeId, challenge } = generateChallenge();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    await this.#challengeRepo.create({
      id: challengeId,
      vault_address: address,
      challenge,
      expires_at: expiresAt,
    });
    return { status: "success", challengeId, challenge };
  }

  async verifyChallenge(
    address: string,
    challengeId: string,
    signature: string,
  ): Promise<
    | { status: "success"; accessToken: string; refreshToken: string }
    | { status: "not_found" | "invalid_challenge"; accessToken?: never; refreshToken?: never }
  > {
    const vault = await this.#vaultRepo.get(address);
    if (!vault) return { status: "not_found" };

    const challenge = await this.#challengeRepo.consumeIfValid(challengeId, address);
    if (challenge === undefined) return { status: "not_found" };

    const valid = await verifySignature(
      JSON.parse(vault.public_key) as JsonWebKey,
      challenge,
      signature,
    );
    if (valid) {
      return { ...(await this.#issueTokenPair(address)), status: "success" };
    }

    return { status: "invalid_challenge" };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<
    { status: "success"; accessToken: string; refreshToken: string } | { status: "invalid" }
  > {
    try {
      const payload = await verify(refreshToken, this.#jwtSecret);
      if (payload.type !== "refresh" || typeof payload.sub !== "string") {
        return { status: "invalid" };
      }
      const { accessToken, refreshToken: newRefreshToken } = await this.#issueTokenPair(
        payload.sub,
      );
      return { status: "success", accessToken, refreshToken: newRefreshToken };
    } catch {
      return { status: "invalid" };
    }
  }
}
