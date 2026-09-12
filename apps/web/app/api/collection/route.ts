import { CHARACTER_CATALOG } from "../../../src/lib/character-catalog";
import { loadCollectionState } from "../../../src/lib/load-collection-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const contract = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
  const configured =
    process.env.PIGVERSE_ENV === "base-sepolia" &&
    process.env.NEXT_PUBLIC_CHAIN_ID === "84532" &&
    contract &&
    rpcUrl;
  let snapshot: Awaited<ReturnType<typeof loadCollectionState>> | null = null;
  if (configured) {
    try {
      snapshot = await loadCollectionState(
        { contract, rpcUrl, chainId: 84532 },
        null,
      );
    } catch {
      // Do not expose configuration or provider diagnostics to public callers.
    }
  }
  return Response.json(
    {
      collection: "Pigverse Genesis",
      maxSupply: 10,
      block: snapshot?.block ?? null,
      mintedCount: snapshot?.mintedCount ?? null,
      degraded: snapshot?.degraded ?? true,
      publicationState: snapshot?.publicationState ?? "unavailable",
      tokens: CHARACTER_CATALOG.map((character) => {
        const state = snapshot?.tokens.find(
          (token) => token.tokenId === character.tokenId,
        );
        return {
          ...character,
          status: state?.status ?? "unknown",
          owner: state?.owner ?? null,
        };
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
