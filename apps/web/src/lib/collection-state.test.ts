import { describe, expect, it } from "vitest";
import { GENESIS_TOKEN_IDS } from "./genesis";
import {
  filterCollectionState,
  projectCollectionState,
  type OwnershipRead,
} from "./collection-state";

const owner = "0x1111111111111111111111111111111111111111";
const unminted = () =>
  new Map<number, OwnershipRead>(
    GENESIS_TOKEN_IDS.map((id) => [id, { state: "unminted" }]),
  );

describe("chain-authoritative collection projection", () => {
  it("keeps exactly ten slots during RPC outage and does not report zero minted", () => {
    const result = projectCollectionState(
      new Map(),
      new Set(GENESIS_TOKEN_IDS),
      false,
    );
    expect(result.tokens.map((token) => token.tokenId)).toEqual(
      GENESIS_TOKEN_IDS,
    );
    expect(result.tokens.every((token) => token.status === "unknown")).toBe(
      true,
    );
    expect(result.mintedCount).toBeNull();
    expect(filterCollectionState(result.tokens, "available")).toEqual([]);
  });

  it("shows chain ownership even when content is unpublished and mint is paused", () => {
    const reads = unminted();
    reads.set(4, { state: "minted", owner });
    const result = projectCollectionState(reads, new Set(), true);
    expect(filterCollectionState(result.tokens, "minted")).toEqual([
      { tokenId: 4, status: "minted", owner },
    ]);
    expect(result.mintedCount).toBe(1);
    expect(filterCollectionState(result.tokens, "all")).toHaveLength(10);
  });

  it("requires known unminted, published and active state for availability", () => {
    const reads = unminted();
    expect(
      filterCollectionState(
        projectCollectionState(reads, new Set([2]), false).tokens,
        "available",
      ).map((token) => token.tokenId),
    ).toEqual([2]);
    expect(
      projectCollectionState(reads, new Set([2]), true).tokens[1]?.status,
    ).toBe("paused");
    expect(
      projectCollectionState(reads, new Set([2]), null).tokens[1]?.status,
    ).toBe("unknown");
    expect(
      projectCollectionState(reads, new Set([2]), false).tokens[0]?.status,
    ).toBe("coming-soon");
  });

  it("does not publish partial counts or admit out-of-range provider rows", () => {
    const reads = unminted();
    reads.set(1, { state: "minted", owner });
    reads.set(10, { state: "unknown" });
    reads.set(11, { state: "minted", owner });
    const result = projectCollectionState(reads, new Set([11]), false);
    expect(result.mintedCount).toBeNull();
    expect(result.tokens).toHaveLength(10);
    expect(filterCollectionState(result.tokens, "minted")).toHaveLength(1);
  });
});
