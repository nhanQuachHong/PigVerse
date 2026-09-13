"use client";

import { useState } from "react";
import {
  useConnect,
  useConnection,
  useConnectors,
  useDisconnect,
  useSwitchChain,
} from "wagmi";

import { targetChain } from "../../lib/web3-config";
import { useLocale } from "../i18n/locale-provider";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { WalletButton, type WalletState } from "../ui/wallet-button";

const shortAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;

export function getWalletState({
  chainId,
  isConnected,
}: {
  chainId?: number;
  isConnected: boolean;
}): WalletState {
  if (!isConnected) return "disconnected";
  return chainId === targetChain.id ? "connected" : "wrong-network";
}

export function WalletControl() {
  const { t } = useLocale();
  const connection = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string>();

  const isConnected = connection.status === "connected";
  const state = getWalletState({
    chainId: connection.chainId,
    isConnected,
  });
  const pending =
    connection.status === "connecting" ||
    connection.status === "reconnecting" ||
    connect.isPending;

  const open = () => {
    setError(undefined);
    setIsOpen(true);
  };

  const close = () => {
    setError(undefined);
    setIsOpen(false);
  };

  const connectWallet = (connector: (typeof connectors)[number]) => {
    setError(undefined);
    connect.mutate(
      { connector },
      {
        onError: () => setError(t("wallet.error")),
        onSuccess: close,
      },
    );
  };

  const switchNetwork = () => {
    setError(undefined);
    switchChain.mutate(
      { chainId: targetChain.id },
      {
        onError: () => setError(t("wallet.error")),
      },
    );
  };

  return (
    <>
      <WalletButton
        address={
          connection.address ? shortAddress(connection.address) : undefined
        }
        aria-busy={pending || undefined}
        disabled={pending}
        onClick={open}
        state={state}
      />
      <Modal
        description={
          isConnected
            ? t("wallet.connectedDescription")
            : t("wallet.connectDescription")
        }
        isOpen={isOpen}
        onClose={close}
        title={isConnected ? t("wallet.connectedTitle") : t("wallet.choose")}
      >
        {isConnected ? (
          <div className="pv-wallet-panel">
            <dl>
              <div>
                <dt>{t("wallet.address")}</dt>
                <dd>{connection.address}</dd>
              </div>
              <div>
                <dt>{t("wallet.network")}</dt>
                <dd>
                  {state === "connected"
                    ? targetChain.name
                    : (connection.chain?.name ??
                      t("wallet.unsupportedNetwork"))}
                </dd>
              </div>
            </dl>
            {state === "wrong-network" && (
              <div className="pv-wallet-panel__warning" role="alert">
                <p>{t("wallet.wrongNetworkDescription")}</p>
                <Button
                  disabled={switchChain.isPending}
                  onClick={switchNetwork}
                  variant="secondary"
                >
                  {switchChain.isPending
                    ? t("wallet.switching")
                    : t("wallet.switchNetwork")}
                </Button>
              </div>
            )}
            {error && <p className="pv-wallet-panel__error">{error}</p>}
            <Button
              onClick={() => {
                disconnect.mutate(undefined, {
                  onSuccess: close,
                });
              }}
              variant="ghost"
            >
              {t("wallet.disconnect")}
            </Button>
          </div>
        ) : (
          <div className="pv-wallet-options">
            {connectors.map((connector) => (
              <Button
                disabled={connect.isPending}
                key={connector.uid}
                onClick={() => connectWallet(connector)}
                variant="secondary"
              >
                {connector.name}
              </Button>
            ))}
            {error && (
              <p className="pv-wallet-panel__error" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
