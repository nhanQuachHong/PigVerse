import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PENDING_PUBLICATION_EVENT,
  pendingPublicationKey,
  readPendingPublication,
  writePendingPublication,
} from "./pending-publication";

const account = "0x2222222222222222222222222222222222222222";
const contract = "0x1111111111111111111111111111111111111111";
const hash = `0x${"a".repeat(64)}` as const;

describe("pending publication persistence", () => {
  afterEach(() => window.localStorage.clear());

  it("scopes one recoverable transaction to chain, contract, token and Owner", () => {
    expect(
      pendingPublicationKey({ account, chainId: 84532, contract, tokenId: 3 }),
    ).toBe(`pigverse:publication:84532:${contract}:3:${account}`);
  });

  it("restores only a valid hash and notifies the active Admin tab", () => {
    const key = pendingPublicationKey({
      account,
      chainId: 84532,
      contract,
      tokenId: 3,
    });
    const listener = vi.fn();
    window.addEventListener(PENDING_PUBLICATION_EVENT, listener);

    writePendingPublication(key, hash);
    expect(readPendingPublication(key)).toBe(hash);
    expect(listener).toHaveBeenCalledOnce();

    window.localStorage.setItem(key, "not-a-transaction");
    expect(readPendingPublication(key)).toBeUndefined();
    writePendingPublication(key, undefined);
    expect(window.localStorage.getItem(key)).toBeNull();
    window.removeEventListener(PENDING_PUBLICATION_EVENT, listener);
  });
});
