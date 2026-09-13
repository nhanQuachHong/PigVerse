"use client";

import Image from "next/image";
import Link from "next/link";

import type { PublicNftDetail } from "../../lib/public-nft-detail";
import { useLocale } from "../i18n/locale-provider";
import { usePublicStateRefresh } from "../public/use-public-state-refresh";
import { Button, ButtonLink } from "../ui/button";
import { NFTCard } from "../ui/nft-card";
import { NFTStatusBadge } from "../ui/nft-status-badge";
import { PageContainer } from "../ui/page-container";
import { SectionHeading } from "../ui/section-heading";

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function NftDetailView({ detail }: { detail: PublicNftDetail }) {
  const { locale } = useLocale();
  const { pending, refresh } = usePublicStateRefresh();
  const vi = locale === "vi";
  const { deployment, token } = detail;
  const previousId = token.tokenId === 1 ? 10 : token.tokenId - 1;
  const nextId = token.tokenId === 10 ? 1 : token.tokenId + 1;
  const ownerUrl =
    deployment && token.owner
      ? `https://sepolia.basescan.org/address/${token.owner}`
      : null;

  return (
    <PageContainer className="pv-detail-page">
      <nav
        aria-label={vi ? "Đường dẫn" : "Breadcrumb"}
        className="pv-detail-breadcrumb"
      >
        <Link href="/">{vi ? "Trang chủ" : "Home"}</Link>
        <span aria-hidden="true">›</span>
        <Link href="/collection">{vi ? "Bộ sưu tập" : "Collection"}</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{token.name}</span>
      </nav>

      <section className="pv-detail-primary">
        <div className="pv-card pv-detail-artwork">
          <div className="pv-detail-artwork__media">
            <Image
              alt={token.name}
              fill
              priority
              sizes="(max-width: 672px) 100vw, 48vw"
              src={token.artwork}
            />
            <NFTStatusBadge status={token.status} />
          </div>
        </div>

        <div className="pv-card pv-detail-summary">
          <div className="pv-detail-summary__topline">
            <NFTStatusBadge status={token.status} />
            <span>#{token.tokenId} / 10</span>
            <nav aria-label={vi ? "Chuyển nhân vật" : "Character navigation"}>
              <Link
                aria-label={vi ? "NFT trước" : "Previous NFT"}
                href={`/nft/${previousId}`}
              >
                ‹
              </Link>
              <Link
                aria-label={vi ? "NFT tiếp theo" : "Next NFT"}
                href={`/nft/${nextId}`}
              >
                ›
              </Link>
            </nav>
          </div>
          <h1>{token.name}</h1>
          <p className="pv-detail-token">
            Token #{token.tokenId.toString().padStart(2, "0")}
          </p>
          <p className="pv-detail-intro">
            {vi
              ? `${token.name} là một trong 10 nhân vật NFT độc bản 1/1 của Pigverse Genesis.`
              : `${token.name} is one of 10 unique 1/1 NFT characters in Pigverse Genesis.`}
          </p>

          {detail.degraded && (
            <div className="pv-detail-warning" role="status">
              <p>
                {vi
                  ? "Chưa xác minh được đầy đủ trạng thái on-chain. Trạng thái chưa xác định không có nghĩa là NFT có thể mint."
                  : "On-chain state could not be fully verified. Unknown does not mean this NFT is mintable."}
              </p>
              <Button
                disabled={pending}
                onClick={refresh}
                size="sm"
                variant="secondary"
              >
                {vi ? "Thử lại" : "Retry"}
              </Button>
            </div>
          )}

          <dl className="pv-detail-facts">
            <div>
              <dt>{vi ? "Chủ sở hữu" : "Owner"}</dt>
              <dd>
                {token.owner ? (
                  ownerUrl ? (
                    <a
                      href={ownerUrl}
                      rel="noreferrer"
                      target="_blank"
                      title={token.owner}
                    >
                      {shortAddress(token.owner)}
                    </a>
                  ) : (
                    <span title={token.owner}>{shortAddress(token.owner)}</span>
                  )
                ) : token.status === "unknown" ? (
                  vi ? (
                    "Chưa xác định"
                  ) : (
                    "Unavailable"
                  )
                ) : vi ? (
                  "Chưa mint"
                ) : (
                  "Not minted"
                )}
              </dd>
            </div>
            <div>
              <dt>{vi ? "Địa chỉ contract" : "Contract address"}</dt>
              <dd>
                {deployment ? (
                  <a
                    href={deployment.explorerUrl}
                    rel="noreferrer"
                    target="_blank"
                    title={deployment.contract}
                  >
                    {shortAddress(deployment.contract)}
                  </a>
                ) : vi ? (
                  "Chưa cấu hình"
                ) : (
                  "Not configured"
                )}
              </dd>
            </div>
            <div>
              <dt>{vi ? "Mạng" : "Network"}</dt>
              <dd>
                {deployment?.network ??
                  (vi ? "Mục tiêu: Base Sepolia" : "Target: Base Sepolia")}
              </dd>
            </div>
            <div>
              <dt>{vi ? "Tiêu chuẩn" : "Token standard"}</dt>
              <dd>ERC-721</dd>
            </div>
            <div>
              <dt>Metadata URI</dt>
              <dd title={token.metadataUri ?? undefined}>
                {token.metadataUri ??
                  (token.status === "coming-soon"
                    ? vi
                      ? "Chưa công bố"
                      : "Not published"
                    : vi
                      ? "Chưa xác định"
                      : "Unavailable")}
              </dd>
            </div>
          </dl>
          <ButtonLink href="/collection" size="lg">
            {vi ? "Quay lại bộ sưu tập" : "Back to Collection"}
          </ButtonLink>
        </div>
      </section>

      <section className="pv-card pv-detail-story">
        <div>
          <p className="pv-eyebrow">
            {vi
              ? "Nội dung biên tập đang chờ phê duyệt"
              : "Editorial content pending approval"}
          </p>
          <h2>
            {vi ? `Câu chuyện của ${token.name}` : `${token.name}'s Story`}
          </h2>
          <p>
            {vi
              ? "Nội dung truyện VI/EN cuối cùng chưa được Product Owner phê duyệt. Pigverse không xuất bản truyện tạm như nội dung canon."
              : "Final VI/EN story copy has not yet been approved by the Product Owner. Pigverse does not publish placeholder lore as canon."}
          </p>
        </div>
        <Image
          alt=""
          height={450}
          src="/assets/story/story-adventure.png"
          width={800}
        />
      </section>

      <section>
        <SectionHeading
          action={
            <ButtonLink href="/collection" size="sm" variant="secondary">
              {vi ? "Xem cả 10" : "View all 10"}
            </ButtonLink>
          }
          title={vi ? "Các NFT Pigverse khác" : "Related Pigverse NFTs"}
        />
        <div className="pv-detail-related">
          {detail.relatedTokens.map((related) => (
            <NFTCard
              description="Genesis · 1/1"
              href={`/nft/${related.tokenId}`}
              imageAlt={related.name}
              imageSrc={related.artwork}
              key={related.tokenId}
              name={related.name}
              status={related.status}
              tokenId={related.tokenId}
            />
          ))}
        </div>
      </section>

      <aside className="pv-card pv-detail-license">
        <strong>{vi ? "Quyền sử dụng" : "Usage rights"}</strong>
        <p>
          {vi
            ? "Quyền sở hữu NFT cho phép sử dụng cá nhân và mạng xã hội; không chuyển giao bản quyền hoặc quyền khai thác thương mại. Văn bản pháp lý cuối cùng còn chờ phê duyệt trước Mainnet."
            : "NFT ownership permits personal and social use; it does not transfer copyright or commercial exploitation rights. Final legal wording remains pending before Mainnet."}
        </p>
      </aside>
    </PageContainer>
  );
}
