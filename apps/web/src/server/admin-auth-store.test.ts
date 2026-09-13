import { describe, expect, it } from "vitest";

import {
  type AdminChallenge,
  type AdminSession,
  MemoryAdminAuthStore,
} from "./admin-auth-store";

const now = new Date("2026-09-13T00:00:00.000Z");
const challenge: AdminChallenge = {
  chainId: 84532,
  consumedAt: null,
  domain: "pigverse.example",
  expiresAt: new Date("2026-09-13T00:05:00.000Z"),
  issuedAt: now,
  messageHash: "b".repeat(64),
  nonceHash: "a".repeat(64),
  uri: "https://pigverse.example",
  walletAddress: "0x1111111111111111111111111111111111111111",
};
const session: AdminSession = {
  expiresAt: new Date("2026-09-13T00:30:00.000Z"),
  issuedAt: now,
  revokedAt: null,
  tokenHash: "c".repeat(64),
  walletAddress: challenge.walletAddress,
};

describe("Admin auth store contract", () => {
  it("atomically permits only one session for a single challenge", async () => {
    const store = new MemoryAdminAuthStore();
    await store.createChallenge(challenge);

    const results = await Promise.all([
      store.consumeChallengeAndCreateSession(challenge.nonceHash, now, session),
      store.consumeChallengeAndCreateSession(challenge.nonceHash, now, {
        ...session,
        tokenHash: "d".repeat(64),
      }),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(store.sessions).toHaveProperty("size", 1);
  });

  it("rejects expired challenges and expired or revoked sessions", async () => {
    const store = new MemoryAdminAuthStore();
    await store.createChallenge(challenge);
    expect(
      await store.consumeChallengeAndCreateSession(
        challenge.nonceHash,
        challenge.expiresAt,
        session,
      ),
    ).toBe(false);

    const activeStore = new MemoryAdminAuthStore();
    await activeStore.createChallenge(challenge);
    await activeStore.consumeChallengeAndCreateSession(
      challenge.nonceHash,
      now,
      session,
    );
    expect(await activeStore.getSession(session.tokenHash, now)).not.toBeNull();
    await activeStore.revokeSession(session.tokenHash, now);
    expect(await activeStore.getSession(session.tokenHash, now)).toBeNull();
  });
});
