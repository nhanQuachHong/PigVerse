"use client";

import Image from "next/image";

import { useLocale } from "../i18n/locale-provider";
import { Button, ButtonLink } from "./button";
import { Icon } from "./icon";

export function EmptyState() {
  const { t } = useLocale();
  return (
    <div className="pv-feedback-state">
      <Image
        alt=""
        className="pv-feedback-state__image"
        height={188}
        src="/assets/states/empty-my-nfts.png"
        width={240}
      />
      <h3>{t("state.empty.title")}</h3>
      <p>{t("state.empty.description")}</p>
      <ButtonLink href="/collection" size="sm">
        {t("common.explore")} <Icon name="arrow" size={16} />
      </ButtonLink>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useLocale();
  return (
    <div className="pv-feedback-state" role="alert">
      <Image
        alt=""
        className="pv-feedback-state__image"
        height={188}
        src="/assets/states/error-pig.png"
        width={240}
      />
      <h3>{t("state.error.title")}</h3>
      <p>{t("state.error.description")}</p>
      <Button onClick={onRetry} size="sm" variant="secondary">
        <Icon name="refresh" size={16} /> {t("common.retry")}
      </Button>
    </div>
  );
}

export function NFTCardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading NFT" className="pv-skeleton-card">
      <span className="pv-skeleton pv-skeleton--media" />
      <span className="pv-skeleton pv-skeleton--title" />
      <span className="pv-skeleton pv-skeleton--text" />
    </div>
  );
}
