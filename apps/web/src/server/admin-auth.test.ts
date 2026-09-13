import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";

import { MemoryAdminAuthStore } from "./admin-auth-store";
import {
  authenticateAdminSession,
  hashCredential,
  issueAdminChallenge,
  verifyAdminChallenge,
} from "./admin-auth";

const now = new Date("2026-09-13T00:00:00.000Z");
const account = privateKeyToAccount(
  `0x${Buffer.from(new Uint8Array(32).fill(1)).toString("hex")}`,
);

async function fixture(owner: `0x${string}` | null = account.address) {
  const store = new MemoryAdminAuthStore();
  const dependencies = {
    now: () => now,
    nonce: () => "ABCDEF1234567890",
    readOwner: async () => owner,
    sessionToken: () => "test-session-token-with-sufficient-entropy",
    store,
  };
  const challenge = await issueAdminChallenge(
    {
      address: account.address,
      appOrigin: "https://pigverse.example",
      chainId: 84532,
    },
    dependencies,
  );
  const signature = await account.signMessage({ message: challenge.message });
  return { challenge, dependencies, signature, store };
}

describe("Admin SIWE-compatible challenge", () => {
  it("binds address, origin, chain, nonce and expiry without storing plaintext", async () => {
    const { challenge, store } = await fixture();
    expect(challenge.message).toContain(
      "pigverse.example wants you to sign in",
    );
    expect(challenge.message).toContain(`\n${account.address}\n`);
    expect(challenge.message).toContain("URI: https://pigverse.example/admin");
    expect(challenge.message).toContain("Chain ID: 84532");
    const stored = await store.getChallenge(hashCredential(challenge.nonce));
    expect(stored?.nonceHash).not.toContain(challenge.nonce);
    expect(stored?.messageHash).not.toContain(challenge.message);
  });

  it("creates one bounded session for the current owner", async () => {
    const { challenge, dependencies, signature, store } = await fixture();
    const result = await verifyAdminChallenge(
      { message: challenge.message, nonce: challenge.nonce, signature },
      dependencies,
    );
    expect(result.walletAddress).toBe(account.address);
    expect(result.expiresAt.toISOString()).toBe("2026-09-13T00:30:00.000Z");
    expect(
      await store.getSession(hashCredential(result.token), now),
    ).not.toBeNull();
  });

  it("denies a valid signer who is not the current contract owner", async () => {
    const { challenge, dependencies, signature } = await fixture(null);
    await expect(
      verifyAdminChallenge(
        { message: challenge.message, nonce: challenge.nonce, signature },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "AUTH_DENIED" });
  });

  it("rejects message tampering, expiry and replay", async () => {
    const tampered = await fixture();
    await expect(
      verifyAdminChallenge(
        {
          message: `${tampered.challenge.message}\nResources:\n- https://attacker.example`,
          nonce: tampered.challenge.nonce,
          signature: tampered.signature,
        },
        tampered.dependencies,
      ),
    ).rejects.toMatchObject({ code: "AUTH_INVALID" });

    const expired = await fixture();
    expired.dependencies.now = () => new Date("2026-09-13T00:05:00.000Z");
    await expect(
      verifyAdminChallenge(
        {
          message: expired.challenge.message,
          nonce: expired.challenge.nonce,
          signature: expired.signature,
        },
        expired.dependencies,
      ),
    ).rejects.toMatchObject({ code: "AUTH_EXPIRED" });

    const replay = await fixture();
    const input = {
      message: replay.challenge.message,
      nonce: replay.challenge.nonce,
      signature: replay.signature,
    };
    await verifyAdminChallenge(input, replay.dependencies);
    await expect(
      verifyAdminChallenge(input, replay.dependencies),
    ).rejects.toMatchObject({ code: "AUTH_REPLAYED" });
  });

  it("revokes a still-unexpired session when contract ownership changes", async () => {
    const { challenge, dependencies, signature, store } = await fixture();
    const result = await verifyAdminChallenge(
      { message: challenge.message, nonce: challenge.nonce, signature },
      dependencies,
    );
    dependencies.readOwner = async () => null;

    await expect(
      authenticateAdminSession(result.token, dependencies),
    ).resolves.toBeNull();
    expect(
      await store.getSession(hashCredential(result.token), now),
    ).toBeNull();
  });
});
