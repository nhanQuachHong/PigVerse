import { GENESIS_TOKEN_IDS } from "./genesis";

export type OwnershipRead =
  | { state: "minted"; owner: `0x${string}` }
  | { state: "unminted" }
  | { state: "unknown" };

export type CollectionStatus =
  "minted" | "available" | "paused" | "coming-soon" | "unknown";

export type CollectionTokenState = {
  tokenId: number;
  status: CollectionStatus;
  owner: `0x${string}` | null;
};

/** Inputs must be validated by their chain/content adapters. A missing read is
 * unknown, never evidence that a token is unminted (BR-009, SM-002/004). */
export function projectCollectionState(
  ownership: ReadonlyMap<number, OwnershipRead>,
  published: ReadonlySet<number>,
  paused: boolean | null,
): { tokens: CollectionTokenState[]; mintedCount: number | null } {
  const tokens = GENESIS_TOKEN_IDS.map((tokenId): CollectionTokenState => {
    const chain = ownership.get(tokenId);
    if (chain?.state === "minted") {
      return { tokenId, status: "minted", owner: chain.owner };
    }
    if (!chain || chain.state === "unknown") {
      return { tokenId, status: "unknown", owner: null };
    }
    const status = !published.has(tokenId)
      ? "coming-soon"
      : paused === null
        ? "unknown"
        : paused
          ? "paused"
          : "available";
    return { tokenId, status, owner: null };
  });
  const completeOwnership = GENESIS_TOKEN_IDS.every((id) => {
    const read = ownership.get(id);
    return read && read.state !== "unknown";
  });
  return {
    tokens,
    mintedCount: completeOwnership
      ? tokens.filter((token) => token.status === "minted").length
      : null,
  };
}

export function filterCollectionState(
  tokens: readonly CollectionTokenState[],
  filter: "all" | "available" | "minted",
): CollectionTokenState[] {
  return tokens.filter((token) => filter === "all" || token.status === filter);
}
