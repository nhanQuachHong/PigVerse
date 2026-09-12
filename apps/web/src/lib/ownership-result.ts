import type { OwnershipRead } from "./collection-state";

/** Classify ownerOf eth_call output only after network/contract/block binding.
 * OpenZeppelin ERC721NonexistentToken(uint256) selector: 0x7e273289.
 * Generic reverts and transport failures must never imply availability. */
export function classifyOwnershipResult(
  tokenId: number,
  result:
    | { kind: "success"; data: unknown }
    | { kind: "revert"; data: unknown }
    | { kind: "unavailable" },
): OwnershipRead {
  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 10) {
    throw new Error("Invalid Genesis token ID");
  }
  if (result.kind === "unavailable" || typeof result.data !== "string")
    return { state: "unknown" };
  const data = result.data.toLowerCase();
  if (result.kind === "success") {
    // ABI address: exactly one word, with zero left padding and nonzero value.
    if (!/^0x0{24}[0-9a-f]{40}$/.test(data)) return { state: "unknown" };
    const owner = `0x${data.slice(26)}` as `0x${string}`;
    return owner === `0x${"0".repeat(40)}`
      ? { state: "unknown" }
      : { state: "minted", owner };
  }
  const expected = `0x7e273289${tokenId.toString(16).padStart(64, "0")}`;
  return data === expected ? { state: "unminted" } : { state: "unknown" };
}
