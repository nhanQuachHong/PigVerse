"use client";

import { useQuery } from "@tanstack/react-query";
import { useConnection } from "wagmi";

import type { MyNftsResponse } from "../../lib/my-nfts";
import { useLocale } from "../i18n/locale-provider";
import { Button } from "../ui/button";
import { EmptyState, ErrorState, NFTCardSkeleton } from "../ui/feedback-state";
import { NFTCard } from "../ui/nft-card";
import { PageContainer } from "../ui/page-container";

async function loadMyNfts(address: `0x${string}`): Promise<MyNftsResponse> {
  const response = await fetch(
    `/api/my-nfts?address=${encodeURIComponent(address)}`,
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error("Unable to load ownership");
  return response.json();
}

export function MyNftsView() {
  const { locale } = useLocale();
  const connection = useConnection();
  const vi = locale === "vi";
  const address =
    connection.status === "connected" ? connection.address : undefined;
  const query = useQuery({
    enabled: Boolean(address),
    queryFn: () => loadMyNfts(address!),
    queryKey: ["my-genesis-nfts", address],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  return (
    <PageContainer className="pv-my-nfts-page">
      <header className="pv-my-nfts-header">
        <p className="pv-eyebrow">Pigverse Genesis · 1/1</p>
        <h1>{vi ? "NFT của tôi" : "My NFTs"}</h1>
        <p>
          {vi
            ? "Bộ sưu tập này được đối chiếu trực tiếp với quyền sở hữu trên Base Sepolia."
            : "This collection is reconciled directly with ownership on Base Sepolia."}
        </p>
        {address && (
          <code title={address}>
            {address.slice(0, 6)}…{address.slice(-4)}
          </code>
        )}
      </header>

      {!address ? (
        <section className="pv-card pv-my-nfts-state">
          <h2>{vi ? "Kết nối ví của bạn" : "Connect your wallet"}</h2>
          <p>
            {vi
              ? "Pigverse cần địa chỉ ví hiện tại để truy vấn NFT Genesis mà ví đang sở hữu."
              : "Pigverse needs your current wallet address to query the Genesis NFTs it owns."}
          </p>
          <Button
            onClick={() =>
              window.dispatchEvent(new Event("pigverse:open-wallet"))
            }
          >
            {vi ? "Kết nối ví" : "Connect wallet"}
          </Button>
        </section>
      ) : query.isPending ? (
        <section aria-label={vi ? "Đang tải NFT" : "Loading NFTs"}>
          <div className="pv-my-nfts-grid">
            {[1, 2, 3].map((slot) => (
              <NFTCardSkeleton key={slot} />
            ))}
          </div>
        </section>
      ) : query.isError || query.data?.ownershipStatus !== "known" ? (
        <section className="pv-card pv-my-nfts-state">
          <ErrorState onRetry={() => query.refetch()} />
          <p className="pv-my-nfts-trust-note">
            {vi
              ? "Không hiển thị danh sách rỗng giả khi chưa xác minh được chain."
              : "An unverified chain read is never shown as a false empty collection."}
          </p>
        </section>
      ) : query.data.tokens.length === 0 ? (
        <section className="pv-card pv-my-nfts-state">
          <EmptyState />
        </section>
      ) : (
        <section>
          <div className="pv-my-nfts-toolbar">
            <h2>
              {vi
                ? `${query.data.tokens.length} NFT đang sở hữu`
                : `${query.data.tokens.length} owned NFT${query.data.tokens.length === 1 ? "" : "s"}`}
            </h2>
            <Button
              disabled={query.isFetching}
              onClick={() => query.refetch()}
              size="sm"
              variant="secondary"
            >
              {query.isFetching
                ? vi
                  ? "Đang làm mới…"
                  : "Refreshing…"
                : vi
                  ? "Làm mới từ chain"
                  : "Refresh from chain"}
            </Button>
          </div>
          <div className="pv-my-nfts-grid">
            {query.data.tokens.map((token) => (
              <NFTCard
                description="Genesis · 1/1"
                href={`/nft/${token.tokenId}`}
                imageAlt={token.name}
                imageSrc={token.artwork}
                key={token.tokenId}
                name={token.name}
                status="minted"
                tokenId={token.tokenId}
              />
            ))}
          </div>
        </section>
      )}
    </PageContainer>
  );
}
