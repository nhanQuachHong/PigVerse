import { privateKeyToAccount } from "viem/accounts";
import { beforeEach, describe, expect, it } from "vitest";

import { createChallengeHandler } from "../../app/api/admin/auth/challenge/route";
import { createSessionHandlers } from "../../app/api/admin/auth/session/route";
import { createVerifyHandler } from "../../app/api/admin/auth/verify/route";
import { MemoryAdminAuthStore } from "./admin-auth-store";

const appOrigin = "https://pigverse.example";
const now = new Date("2026-09-13T00:00:00.000Z");
const account = privateKeyToAccount(
  `0x${Buffer.from(new Uint8Array(32).fill(2)).toString("hex")}`,
);

describe("Admin auth route boundary", () => {
  let owner: `0x${string}` | null;
  let store: MemoryAdminAuthStore;
  let runtime: () => {
    appOrigin: string;
    chainId: 84532;
    now: () => Date;
    nonce: () => string;
    readOwner: () => Promise<`0x${string}` | null>;
    sessionToken: () => string;
    store: MemoryAdminAuthStore;
  };

  beforeEach(() => {
    owner = account.address;
    store = new MemoryAdminAuthStore();
    runtime = () => ({
      appOrigin,
      chainId: 84532,
      now: () => now,
      nonce: () => "ROUTETEST12345678",
      readOwner: async () => owner,
      sessionToken: () => "route-test-session-token-with-enough-entropy",
      store,
    });
  });

  it("rejects cross-origin challenge issuance", async () => {
    const response = await createChallengeHandler(runtime)(
      new Request(`${appOrigin}/api/admin/auth/challenge`, {
        body: JSON.stringify({ address: account.address }),
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil.example",
        },
        method: "POST",
      }),
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(store.challenges.size).toBe(0);
  });

  it("rate-limits challenge abuse before persistence", async () => {
    const response = await createChallengeHandler(runtime, {
      consume: () => false,
    })(
      new Request(`${appOrigin}/api/admin/auth/challenge`, {
        body: JSON.stringify({ address: account.address }),
        headers: { "Content-Type": "application/json", Origin: appOrigin },
        method: "POST",
      }),
    );
    expect(response.status).toBe(429);
    expect(store.challenges.size).toBe(0);
  });

  it("sets only an opaque HttpOnly strict session after owner verification", async () => {
    const challengeResponse = await createChallengeHandler(runtime)(
      new Request(`${appOrigin}/api/admin/auth/challenge`, {
        body: JSON.stringify({ address: account.address }),
        headers: { "Content-Type": "application/json", Origin: appOrigin },
        method: "POST",
      }),
    );
    const challenge = await challengeResponse.json();
    const signature = await account.signMessage({ message: challenge.message });
    const verifyResponse = await createVerifyHandler(runtime)(
      new Request(`${appOrigin}/api/admin/auth/verify`, {
        body: JSON.stringify({ ...challenge, signature }),
        headers: { "Content-Type": "application/json", Origin: appOrigin },
        method: "POST",
      }),
    );
    const cookie = verifyResponse.headers.get("set-cookie") ?? "";
    expect(verifyResponse.status).toBe(200);
    expect(cookie).toContain("pigverse-admin=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(await verifyResponse.json()).not.toHaveProperty("token");

    const sessionResponse = await createSessionHandlers(runtime).GET(
      new Request(`${appOrigin}/api/admin/auth/session`, {
        headers: { cookie: cookie.split(";")[0] ?? "" },
      }),
    );
    expect(sessionResponse.status).toBe(200);
    await expect(sessionResponse.json()).resolves.toMatchObject({
      authenticated: true,
      walletAddress: account.address,
    });
  });

  it("fails a prior-owner session closed after ownership transfer", async () => {
    const challenge = await createChallengeHandler(runtime)(
      new Request(`${appOrigin}/api/admin/auth/challenge`, {
        body: JSON.stringify({ address: account.address }),
        headers: { "Content-Type": "application/json", Origin: appOrigin },
        method: "POST",
      }),
    ).then((response) => response.json());
    const signature = await account.signMessage({ message: challenge.message });
    const verified = await createVerifyHandler(runtime)(
      new Request(`${appOrigin}/api/admin/auth/verify`, {
        body: JSON.stringify({ ...challenge, signature }),
        headers: { "Content-Type": "application/json", Origin: appOrigin },
        method: "POST",
      }),
    );
    owner = null;
    const response = await createSessionHandlers(runtime).GET(
      new Request(`${appOrigin}/api/admin/auth/session`, {
        headers: {
          cookie: verified.headers.get("set-cookie")?.split(";")[0] ?? "",
        },
      }),
    );
    expect(response.status).toBe(401);
    expect(store.sessions.values().next().value?.revokedAt).not.toBeNull();
  });
});
