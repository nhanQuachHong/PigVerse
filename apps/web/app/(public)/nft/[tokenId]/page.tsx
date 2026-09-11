import { PlannedRoute } from "../../../../src/components/layout/planned-route";

export default async function NftDetailPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  return <PlannedRoute milestone="M4" title={`NFT #${tokenId}`} />;
}
