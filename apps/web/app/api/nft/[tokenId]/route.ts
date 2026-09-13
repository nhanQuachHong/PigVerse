import {
  getPublicNftDetail,
  parseGenesisTokenId,
} from "../../../../src/lib/public-nft-detail";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  const tokenId = parseGenesisTokenId((await params).tokenId);
  const detail = tokenId === null ? null : await getPublicNftDetail(tokenId);
  if (!detail)
    return Response.json(
      { code: "GENESIS_TOKEN_NOT_FOUND", message: "NFT not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  return Response.json(detail, {
    headers: { "Cache-Control": "no-store" },
  });
}
