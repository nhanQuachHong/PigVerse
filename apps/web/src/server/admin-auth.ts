import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { getAddress, isAddress, verifyMessage } from "viem";

import type {
  AdminAuthStore,
  AdminChallenge,
  AdminSession,
} from "./admin-auth-store";

export const ADMIN_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const ADMIN_SESSION_TTL_MS = 30 * 60 * 1000;

export type AdminAuthDependencies = {
  now?: () => Date;
  nonce?: () => string;
  readOwner: () => Promise<`0x${string}` | null>;
  sessionToken?: () => string;
  store: AdminAuthStore;
};

export class AdminAuthError extends Error {
  constructor(
    readonly code:
      "AUTH_DENIED" | "AUTH_EXPIRED" | "AUTH_INVALID" | "AUTH_REPLAYED",
  ) {
    super(code);
  }
}

export function hashCredential(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hashesEqual(left: string, right: string) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function secureNonce() {
  return randomBytes(16).toString("hex");
}

function secureSessionToken() {
  return randomBytes(32).toString("base64url");
}

function parseAppOrigin(origin: string) {
  const parsed = new URL(origin);
  const local =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.origin !== origin || (parsed.protocol !== "https:" && !local))
    throw new AdminAuthError("AUTH_INVALID");
  return parsed;
}

export async function issueAdminChallenge(
  input: { address: string; appOrigin: string; chainId: 84532 },
  dependencies: AdminAuthDependencies,
) {
  if (!isAddress(input.address)) throw new AdminAuthError("AUTH_INVALID");
  const walletAddress = getAddress(input.address);
  const origin = parseAppOrigin(input.appOrigin);
  const now = dependencies.now?.() ?? new Date();
  const expiresAt = new Date(now.getTime() + ADMIN_CHALLENGE_TTL_MS);
  const nonce = dependencies.nonce?.() ?? secureNonce();
  if (!/^[a-zA-Z0-9]{8,64}$/.test(nonce))
    throw new AdminAuthError("AUTH_INVALID");
  const uri = `${origin.origin}/admin`;
  const message = `${origin.host} wants you to sign in with your Ethereum account:\n${walletAddress}\n\nSign in to Pigverse Admin. No blockchain transaction will be sent.\n\nURI: ${uri}\nVersion: 1\nChain ID: ${input.chainId}\nNonce: ${nonce}\nIssued At: ${now.toISOString()}\nExpiration Time: ${expiresAt.toISOString()}`;
  const challenge: AdminChallenge = {
    chainId: input.chainId,
    consumedAt: null,
    domain: origin.host,
    expiresAt,
    issuedAt: now,
    messageHash: hashCredential(message),
    nonceHash: hashCredential(nonce),
    uri,
    walletAddress,
  };
  await dependencies.store.createChallenge(challenge);
  return { expiresAt: expiresAt.toISOString(), message, nonce };
}

export async function verifyAdminChallenge(
  input: { message: string; nonce: string; signature: string },
  dependencies: AdminAuthDependencies,
) {
  if (
    !/^[a-zA-Z0-9]{8,64}$/.test(input.nonce) ||
    typeof input.message !== "string" ||
    input.message.length > 2048 ||
    !/^0x(?:[0-9a-fA-F]{128}|[0-9a-fA-F]{130})$/.test(input.signature)
  )
    throw new AdminAuthError("AUTH_INVALID");
  const now = dependencies.now?.() ?? new Date();
  const nonceHash = hashCredential(input.nonce);
  const challenge = await dependencies.store.getChallenge(nonceHash);
  if (!challenge) throw new AdminAuthError("AUTH_INVALID");
  if (challenge.consumedAt) throw new AdminAuthError("AUTH_REPLAYED");
  if (challenge.expiresAt.getTime() <= now.getTime())
    throw new AdminAuthError("AUTH_EXPIRED");
  if (!hashesEqual(challenge.messageHash, hashCredential(input.message)))
    throw new AdminAuthError("AUTH_INVALID");
  const signature = input.signature as `0x${string}`;
  let validSignature = false;
  try {
    validSignature = await verifyMessage({
      address: challenge.walletAddress,
      message: input.message,
      signature,
    });
  } catch {
    throw new AdminAuthError("AUTH_INVALID");
  }
  if (!validSignature) throw new AdminAuthError("AUTH_INVALID");
  const owner = await dependencies.readOwner();
  if (!owner || owner.toLowerCase() !== challenge.walletAddress.toLowerCase())
    throw new AdminAuthError("AUTH_DENIED");
  const token = dependencies.sessionToken?.() ?? secureSessionToken();
  const session: AdminSession = {
    expiresAt: new Date(now.getTime() + ADMIN_SESSION_TTL_MS),
    issuedAt: now,
    revokedAt: null,
    tokenHash: hashCredential(token),
    walletAddress: challenge.walletAddress,
  };
  const consumed = await dependencies.store.consumeChallengeAndCreateSession(
    nonceHash,
    now,
    session,
  );
  if (!consumed) throw new AdminAuthError("AUTH_REPLAYED");
  return {
    expiresAt: session.expiresAt,
    token,
    walletAddress: session.walletAddress,
  };
}

export async function authenticateAdminSession(
  token: string,
  dependencies: Pick<AdminAuthDependencies, "now" | "readOwner" | "store">,
) {
  if (typeof token !== "string" || token.length < 32 || token.length > 128)
    return null;
  const now = dependencies.now?.() ?? new Date();
  const tokenHash = hashCredential(token);
  const session = await dependencies.store.getSession(tokenHash, now);
  if (!session) return null;
  const owner = await dependencies.readOwner();
  if (!owner || owner.toLowerCase() !== session.walletAddress.toLowerCase()) {
    await dependencies.store.revokeSession(tokenHash, now);
    return null;
  }
  return session;
}
