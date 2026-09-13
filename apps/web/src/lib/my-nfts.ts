import { getAddress, isAddress } from "viem";

import {
  getPublicCollection,
  type PublicCollection,
} from "./public-collection";

export type MyNftsResponse = {
  address: `0x${string}`;
  block: string | null;
  ownershipStatus: "known" | "unavailable";
  tokens: PublicCollection["tokens"];
};

export function selectOwnedTokens(
  collection: PublicCollection,
  address: `0x${string}`,
): PublicCollection["tokens"] {
  if (collection.mintedCount === null) return [];
  const normalized = address.toLowerCase();
  return collection.tokens.filter(
    (token) => token.owner?.toLowerCase() === normalized,
  );
}

export async function getMyNfts(
  address: string,
  environment: Parameters<typeof getPublicCollection>[0] = process.env,
): Promise<MyNftsResponse | null> {
  if (!isAddress(address)) return null;
  const normalized = getAddress(address);
  const collection = await getPublicCollection(environment);
  const ownershipStatus =
    collection.mintedCount === null ? "unavailable" : "known";
  return {
    address: normalized,
    block: collection.block,
    ownershipStatus,
    tokens:
      ownershipStatus === "known"
        ? selectOwnedTokens(collection, normalized)
        : [],
  };
}
