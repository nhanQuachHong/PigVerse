import Image from "next/image";
import Link from "next/link";

import { Icon } from "./icon";
import { NFTStatusBadge, type NFTStatus } from "./nft-status-badge";

export type NFTCardProps = {
  description: string;
  href: string;
  imageAlt: string;
  imageSrc: string;
  name: string;
  status: NFTStatus;
  tokenId: number;
};

export function NFTCard({
  description,
  href,
  imageAlt,
  imageSrc,
  name,
  status,
  tokenId,
}: NFTCardProps) {
  const tokenLabel = `#${tokenId.toString().padStart(2, "0")}`;

  return (
    <article className="pv-nft-card">
      <Link
        aria-label={`${name}, token ${tokenLabel}`}
        className="pv-nft-card__link"
        href={href}
      >
        <div className="pv-nft-card__media">
          <Image
            alt={imageAlt}
            fill
            sizes="(max-width: 640px) 80vw, (max-width: 1024px) 40vw, 280px"
            src={imageSrc}
          />
          <NFTStatusBadge status={status} />
        </div>
        <div className="pv-nft-card__body">
          <div>
            <h3>{name}</h3>
            <p className="pv-nft-card__token">Token {tokenLabel}</p>
          </div>
          <span className="pv-nft-card__arrow" aria-hidden="true">
            <Icon name="arrow" size={17} />
          </span>
          <p className="pv-nft-card__description">{description}</p>
        </div>
      </Link>
    </article>
  );
}
