import { getMyNfts } from "../../../src/lib/my-nfts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address") ?? "";
  const result = await getMyNfts(address);
  if (!result) {
    return Response.json(
      { code: "INVALID_WALLET_ADDRESS", message: "Invalid wallet address" },
      { status: 400 },
    );
  }
  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
