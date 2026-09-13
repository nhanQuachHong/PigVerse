"use client";

import Image from "next/image";
import Link from "next/link";

import type { CollectionData } from "../collection/collection-view";
import { useLocale } from "../i18n/locale-provider";
import { usePublicStateRefresh } from "../public/use-public-state-refresh";
import { Button, ButtonLink } from "../ui/button";
import { NFTCard } from "../ui/nft-card";
import { NFTStatusBadge } from "../ui/nft-status-badge";
import { PageContainer } from "../ui/page-container";
import { SectionHeading } from "../ui/section-heading";

const FEATURED_TOKEN_IDS = new Set([1, 2, 3, 4]);

export function HomeView({ data }: { data: CollectionData }) {
  const { locale } = useLocale();
  const { pending, refresh } = usePublicStateRefresh();
  const vi = locale === "vi";
  const featured = data.tokens.filter((token) =>
    FEATURED_TOKEN_IDS.has(token.tokenId),
  );

  return (
    <>
      <section className="pv-home-hero">
        <PageContainer className="pv-home-hero__inner">
          <div className="pv-home-hero__copy">
            <p className="pv-eyebrow">Small pigs. Big adventures.</p>
            <h1>
              {vi ? "Gặp gỡ" : "Meet the"} <span>10</span> <br />
              {vi ? "chú heo Pigverse" : "Pigs of Pigverse"}
            </h1>
            <p>
              {vi
                ? "Bộ sưu tập gồm 10 nhân vật NFT độc bản 1/1 sống trong một thế giới đáng yêu, hỗn loạn và đầy phiêu lưu trên Base Sepolia."
                : "A collection of 10 unique 1/1 NFT characters living in a cute, chaotic and adventurous world on Base Sepolia."}
            </p>
            <div className="pv-home-hero__actions">
              <ButtonLink href="/collection" size="lg">
                {vi ? "Khám phá bộ sưu tập" : "Explore Collection"}
              </ButtonLink>
              <ButtonLink href="/story" size="lg" variant="secondary">
                {vi ? "Đọc câu chuyện" : "Read Story"}
              </ButtonLink>
            </div>
            <ul
              className="pv-home-facts"
              aria-label={vi ? "Điểm nổi bật" : "Highlights"}
            >
              <li>10 NFT 1/1</li>
              <li>{vi ? "Quyền sở hữu on-chain" : "On-chain ownership"}</li>
              <li>VI + EN</li>
            </ul>
          </div>
          <Image
            alt=""
            className="pv-home-hero__art"
            height={450}
            priority
            src="/assets/hero/hero-composition-captain-nova-sir-snout-chef.png"
            width={800}
          />
        </PageContainer>
      </section>

      <PageContainer className="pv-home-content">
        <section
          className="pv-card pv-home-progress"
          aria-labelledby="home-progress-title"
        >
          <div>
            <p id="home-progress-title">
              {vi ? "Tiến độ bộ sưu tập" : "Collection Progress"}
            </p>
            <strong>
              <span>{data.mintedCount ?? "—"}</span> / 10{" "}
              {vi ? "đã mint" : "Minted"}
            </strong>
          </div>
          <div className="pv-home-progress__track">
            {data.mintedCount !== null ? (
              <progress
                aria-label={vi ? "Số NFT đã mint" : "Minted NFTs"}
                max={10}
                value={data.mintedCount}
              />
            ) : (
              <p role="status">
                {vi
                  ? "Chưa xác minh được trạng thái on-chain."
                  : "On-chain state is currently unavailable."}
              </p>
            )}
          </div>
          <div className="pv-home-progress__network">
            <span>Base Sepolia</span>
            {data.degraded && (
              <Button
                disabled={pending}
                onClick={refresh}
                size="sm"
                variant="ghost"
              >
                {vi ? "Thử lại" : "Retry"}
              </Button>
            )}
          </div>
        </section>

        <section>
          <SectionHeading
            action={
              <ButtonLink href="/collection" size="sm" variant="secondary">
                {vi ? "Xem cả 10" : "View all 10"}
              </ButtonLink>
            }
            description={
              vi
                ? "Làm quen với những gương mặt đầu tiên trong Pigverse."
                : "Meet some of the first faces in Pigverse."
            }
            title={vi ? "Nhân vật nổi bật" : "Featured Pigs"}
          />
          <div className="pv-home-featured">
            {featured.map((token) => (
              <NFTCard
                description={
                  vi ? "Genesis độc bản · 1/1" : "Unique Genesis · 1/1"
                }
                href={`/nft/${token.tokenId}`}
                imageAlt={token.name}
                imageSrc={token.artwork}
                key={token.tokenId}
                name={token.name}
                status={token.status}
                tokenId={token.tokenId}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionHeading
            action={
              <ButtonLink href="/collection" size="sm" variant="secondary">
                {vi ? "Xem tất cả" : "View all"}
              </ButtonLink>
            }
            description={
              vi
                ? "10 nhân vật. 10 cá tính. Bạn sẽ chọn ai?"
                : "10 characters. 10 personalities. Who will you choose?"
            }
            title={vi ? "Toàn bộ bộ sưu tập" : "The Full Collection"}
          />
          <div className="pv-home-token-strip">
            {data.tokens.map((token) => (
              <Link href={`/nft/${token.tokenId}`} key={token.tokenId}>
                <Image
                  alt={token.name}
                  height={160}
                  src={token.artwork}
                  width={160}
                />
                <strong>#{token.tokenId.toString().padStart(2, "0")}</strong>
                <NFTStatusBadge status={token.status} />
              </Link>
            ))}
          </div>
        </section>

        <section className="pv-card pv-home-story">
          <div>
            <p className="pv-eyebrow">
              A world of little pigs with big dreams.
            </p>
            <h2>{vi ? "Câu chuyện Pigverse" : "The Pigverse Story"}</h2>
            <p>
              {vi
                ? "Phía trên những tầng mây, mười chú heo độc nhất cùng bước vào một chuyến phiêu lưu về lòng tốt, sự tò mò và tình bạn."
                : "Beyond the clouds, ten unique pigs begin an adventure shaped by kindness, curiosity and friendship."}
            </p>
            <ButtonLink href="/story">
              {vi ? "Đọc toàn bộ câu chuyện" : "Read the Full Story"}
            </ButtonLink>
          </div>
          <Image
            alt=""
            height={450}
            src="/assets/story/story-adventure.png"
            width={800}
          />
        </section>
      </PageContainer>
    </>
  );
}
