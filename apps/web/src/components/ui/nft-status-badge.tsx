"use client";

import { useLocale } from "../i18n/locale-provider";

export type NFTStatus =
  "available" | "minted" | "minting" | "coming-soon" | "paused" | "unknown";

const messageKeys = {
  available: "status.available",
  minted: "status.minted",
  minting: "status.minting",
  "coming-soon": "status.comingSoon",
  paused: "status.paused",
  unknown: "status.unknown",
} as const;

export function NFTStatusBadge({ status }: { status: NFTStatus }) {
  const { t } = useLocale();

  return (
    <span className={`pv-status pv-status--${status}`} data-status={status}>
      <span aria-hidden="true" className="pv-status__dot" />
      {t(messageKeys[status])}
    </span>
  );
}
