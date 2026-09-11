"use client";

import { useLocale } from "../i18n/locale-provider";
import { Icon } from "./icon";

export type WalletState = "disconnected" | "connected" | "wrong-network";

export function WalletButton({
  address = "0xA3bc…7F2D",
  onClick,
  state = "disconnected",
}: {
  address?: string;
  onClick?: () => void;
  state?: WalletState;
}) {
  const { t } = useLocale();
  const label =
    state === "connected"
      ? address
      : state === "wrong-network"
        ? t("wallet.wrongNetwork")
        : t("wallet.connect");
  const accessibleLabel =
    state === "connected" ? `${address}, ${t("wallet.connected")}` : label;

  return (
    <button
      aria-label={accessibleLabel}
      className={`pv-wallet-button pv-wallet-button--${state}`}
      onClick={onClick}
      type="button"
    >
      <Icon name={state === "wrong-network" ? "alert" : "wallet"} />
      <span>{label}</span>
      {state === "connected" && (
        <span
          aria-label={t("wallet.connected")}
          className="pv-wallet-button__connected"
        />
      )}
    </button>
  );
}
