import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PENDING_OWNER_CONTROL_EVENT,
  pendingOwnerControlKey,
  readPendingOwnerControl,
  writePendingOwnerControl,
} from "./pending-owner-control";

const account = "0x2222222222222222222222222222222222222222";
const contract = "0x1111111111111111111111111111111111111111";
const hash = `0x${"a".repeat(64)}` as const;

describe("pending Owner control persistence", () => {
  afterEach(() => window.localStorage.clear());

  it("scopes one recoverable transaction to chain, contract and Owner", () => {
    expect(pendingOwnerControlKey({ account, chainId: 84532, contract })).toBe(
      `pigverse:owner-control:84532:${contract}:${account}`,
    );
  });

  it("restores only a valid hash and notifies the active Admin tab", () => {
    const key = pendingOwnerControlKey({
      account,
      chainId: 84532,
      contract,
    });
    const listener = vi.fn();
    window.addEventListener(PENDING_OWNER_CONTROL_EVENT, listener);

    writePendingOwnerControl(key, hash);
    expect(readPendingOwnerControl(key)).toBe(hash);
    expect(listener).toHaveBeenCalledOnce();

    window.localStorage.setItem(key, "not-a-transaction");
    expect(readPendingOwnerControl(key)).toBeUndefined();
    writePendingOwnerControl(key, undefined);
    expect(window.localStorage.getItem(key)).toBeNull();
    window.removeEventListener(PENDING_OWNER_CONTROL_EVENT, listener);
  });
});
