import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PENDING_MINT_EVENT,
  pendingMintKey,
  readPendingMint,
  writePendingMint,
} from "./pending-mint";

const account = "0x2222222222222222222222222222222222222222";
const contract = "0x1111111111111111111111111111111111111111";
const hash = `0x${"a".repeat(64)}` as const;

describe("pending mint persistence", () => {
  afterEach(() => window.localStorage.clear());

  it("scopes a pending transaction to chain, contract, token and account", () => {
    expect(
      pendingMintKey({ account, chainId: 84532, contract, tokenId: 4 }),
    ).toBe(`pigverse:mint:84532:${contract}:4:${account}`);
  });

  it("only restores a valid transaction hash and notifies the active tab", () => {
    const key = pendingMintKey({
      account,
      chainId: 84532,
      contract,
      tokenId: 4,
    });
    const listener = vi.fn();
    window.addEventListener(PENDING_MINT_EVENT, listener);

    writePendingMint(key, hash);
    expect(readPendingMint(key)).toBe(hash);
    expect(listener).toHaveBeenCalledOnce();

    window.localStorage.setItem(key, "not-a-transaction");
    expect(readPendingMint(key)).toBeUndefined();
    writePendingMint(key, undefined);
    expect(window.localStorage.getItem(key)).toBeNull();
    window.removeEventListener(PENDING_MINT_EVENT, listener);
  });
});
