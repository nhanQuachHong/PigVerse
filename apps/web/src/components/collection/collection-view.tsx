"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale } from "../i18n/locale-provider";
import { Button, ButtonLink } from "../ui/button";
import { PageContainer } from "../ui/page-container";
import { NFTCard } from "../ui/nft-card";
import type { CollectionStatus } from "../../lib/collection-state";

export type CollectionData = {
  mintedCount: number | null;
  degraded: boolean;
  tokens: {
    tokenId: number;
    name: string;
    artwork: string;
    status: CollectionStatus;
    owner: string | null;
  }[];
};

export function CollectionView({ data }: { data: CollectionData }) {
  const { locale } = useLocale();
  const vi = locale === "vi";
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "available" | "minted">("all");
  const tokens = data.tokens.filter(
    (token) => filter === "all" || token.status === filter,
  );
  return (
    <>
      <section className="pv-collection-hero">
        <PageContainer className="pv-collection-intro">
          <div>
            <p className="pv-eyebrow">Small pigs. Big adventures.</p>
            <h1>
              {vi ? "Khám phá thế giới" : "The full"}
              <br />
              <span>Pigverse Collection</span>
            </h1>
            <p>
              {vi
                ? "10 nhân vật NFT độc bản 1/1. Những chú heo khác biệt, chung một thế giới phiêu lưu trên Base Sepolia."
                : "10 unique 1/1 NFT characters. Different pigs, one world of adventures on Base Sepolia."}
            </p>
            <ButtonLink href="#collection-grid">
              {vi ? "Khám phá bộ sưu tập" : "Start exploring"}
            </ButtonLink>{" "}
            <ButtonLink href="/story" variant="secondary">
              {vi ? "Đọc câu chuyện" : "Read story"}
            </ButtonLink>
          </div>
          <Image
            src="/assets/hero/hero-composition-captain-nova-sir-snout-chef.png"
            alt=""
            width={800}
            height={450}
            priority
          />
        </PageContainer>
      </section>
      <PageContainer className="pv-collection-content">
        <section
          className="pv-card pv-collection-progress"
          aria-label={vi ? "Tiến độ bộ sưu tập" : "Collection progress"}
        >
          <div>
            <p>{vi ? "Tiến độ bộ sưu tập" : "Collection progress"}</p>
            <strong>
              {data.mintedCount ?? "—"} / 10 {vi ? "đã mint" : "minted"}
            </strong>
          </div>
          {data.mintedCount !== null && (
            <progress
              max={10}
              value={data.mintedCount}
              aria-label={vi ? "Số NFT đã mint" : "Minted NFTs"}
            />
          )}
          <span>Base Sepolia</span>
        </section>
        {data.degraded && (
          <div className="pv-collection-notice" role="status">
            <p>
              {vi
                ? "Chưa xác minh được đầy đủ trạng thái on-chain. Trạng thái chưa xác định không có nghĩa là NFT có thể mint."
                : "Some on-chain states could not be verified. An unknown status does not mean an NFT is available to mint."}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.refresh()}
            >
              {vi ? "Thử lại" : "Retry"}
            </Button>
          </div>
        )}
        <section id="collection-grid">
          <div className="pv-collection-toolbar">
            <h2>{vi ? "Cả 10 nhân vật" : "All 10 pigs"}</h2>
            <div
              role="group"
              aria-label={vi ? "Lọc bộ sưu tập" : "Collection filters"}
            >
              {(["all", "available", "minted"] as const).map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={filter === value ? "primary" : "secondary"}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {value === "all"
                    ? vi
                      ? "Tất cả"
                      : "All"
                    : value === "available"
                      ? vi
                        ? "Có thể mint"
                        : "Available"
                      : vi
                        ? "Đã mint"
                        : "Minted"}
                </Button>
              ))}
            </div>
          </div>
          <div className="pv-collection-grid">
            {tokens.map((token) => (
              <div key={token.tokenId}>
                <NFTCard
                  tokenId={token.tokenId}
                  name={token.name}
                  imageSrc={token.artwork}
                  imageAlt={token.name}
                  status={token.status}
                  href={`/nft/${token.tokenId}`}
                  description="Genesis · 1/1"
                />
                {token.owner && (
                  <p className="pv-collection-owner">
                    {vi ? "Chủ sở hữu" : "Owner"}:{" "}
                    <span title={token.owner}>
                      {token.owner.slice(0, 6)}…{token.owner.slice(-4)}
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
          {tokens.length === 0 && (
            <p role="status">
              {vi
                ? "Không có NFT đã xác minh phù hợp với bộ lọc này."
                : "No verified NFTs match this filter."}
            </p>
          )}
        </section>
        <section className="pv-card pv-collection-about">
          <h2>
            {vi
              ? "Một bộ sưu tập. Mười cuộc phiêu lưu."
              : "One collection. Ten adventures."}
          </h2>
          <p>
            {vi
              ? "Genesis giới hạn 10 NFT. Quyền sở hữu được xác định trên blockchain. NFT dành cho sử dụng cá nhân và xã hội, không cấp quyền thương mại."
              : "Genesis is limited to 10 NFTs. Ownership is recorded on-chain. NFTs allow personal and social use, without commercial rights."}
          </p>
        </section>
      </PageContainer>
    </>
  );
}
