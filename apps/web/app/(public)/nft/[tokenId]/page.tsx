import { notFound } from "next/navigation";

import { NftDetailView } from "../../../../src/components/nft-detail/nft-detail-view";
import {
  getPublicNftDetail,
  parseGenesisTokenId,
} from "../../../../src/lib/public-nft-detail";
import "../../../../src/styles/nft-detail.css";

export const dynamic = "force-dynamic";

export default async function NftDetailPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const parsedTokenId = parseGenesisTokenId(tokenId);
  if (parsedTokenId === null) notFound();
  const detail = await getPublicNftDetail(parsedTokenId);
  if (!detail) notFound();
  return <NftDetailView detail={detail} />;
}
