"use client";

import { type FormEvent, useEffect, useState } from "react";
import { formatEther, parseEther, type Address, type Hash } from "viem";
import {
  useConnection,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { genesisAbi } from "../../lib/genesis-contract";
import { targetChain } from "../../lib/web3-config";
import { useLocale } from "../i18n/locale-provider";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { FormField } from "../ui/form-field";
import { Icon } from "../ui/icon";

type OwnerAction = "pause" | "price" | "unpause";

export function OwnerControls({
  contractAddress,
  ownerWallet,
}: {
  contractAddress: Address | null;
  ownerWallet: Address;
}) {
  const { t } = useLocale();
  const connection = useConnection();
  const writeContract = useWriteContract();
  const [hash, setHash] = useState<Hash>();
  const [action, setAction] = useState<OwnerAction>();
  const [priceInput, setPriceInput] = useState<string>();
  const [error, setError] = useState(false);
  const enabled = Boolean(contractAddress);
  const paused = useReadContract({
    abi: genesisAbi,
    address: contractAddress ?? undefined,
    chainId: targetChain.id,
    functionName: "paused",
    query: { enabled },
  });
  const mintPrice = useReadContract({
    abi: genesisAbi,
    address: contractAddress ?? undefined,
    chainId: targetChain.id,
    functionName: "mintPrice",
    query: { enabled },
  });
  const receipt = useWaitForTransactionReceipt({
    chainId: targetChain.id,
    confirmations: 1,
    hash,
    query: { enabled: Boolean(hash) },
  });
  const connectedOwner =
    connection.status === "connected" &&
    !!connection.address &&
    connection.address.toLowerCase() === ownerWallet.toLowerCase();
  const correctNetwork = connection.chainId === targetChain.id;
  const canWrite =
    !!contractAddress &&
    connectedOwner &&
    correctNetwork &&
    !hash &&
    !writeContract.isPending;
  const chainUnavailable = paused.isError || mintPrice.isError;
  const refetchPaused = paused.refetch;
  const refetchMintPrice = mintPrice.refetch;
  const displayedPrice =
    priceInput ??
    (mintPrice.data === undefined ? "" : formatEther(mintPrice.data));

  useEffect(() => {
    if (receipt.data?.status !== "success") return;
    void refetchPaused();
    void refetchMintPrice();
  }, [receipt.data?.status, refetchMintPrice, refetchPaused]);

  const sendPause = async () => {
    if (!canWrite || !contractAddress || paused.data === undefined) return;
    setError(false);
    try {
      const nextAction = paused.data ? "unpause" : "pause";
      const transactionHash = paused.data
        ? await writeContract.mutateAsync({
            abi: genesisAbi,
            account: connection.address,
            address: contractAddress,
            chainId: targetChain.id,
            functionName: "unpause",
          })
        : await writeContract.mutateAsync({
            abi: genesisAbi,
            account: connection.address,
            address: contractAddress,
            chainId: targetChain.id,
            functionName: "pause",
          });
      setAction(nextAction);
      setHash(transactionHash);
    } catch {
      setError(true);
    }
  };

  const sendPrice = async (event: FormEvent) => {
    event.preventDefault();
    if (!canWrite || !contractAddress) return;
    setError(false);
    try {
      const newPrice = parseEther(displayedPrice.trim());
      const transactionHash = await writeContract.mutateAsync({
        abi: genesisAbi,
        account: connection.address,
        address: contractAddress,
        args: [newPrice],
        chainId: targetChain.id,
        functionName: "setMintPrice",
      });
      setAction("price");
      setHash(transactionHash);
    } catch {
      setError(true);
    }
  };

  const clearTransaction = () => {
    setAction(undefined);
    setHash(undefined);
    setError(false);
  };

  return (
    <section className="pv-owner-controls" id="contract-controls">
      <div className="pv-admin-content__heading">
        <div>
          <p className="pv-eyebrow">{t("admin.ownerControlsEyebrow")}</p>
          <h2>{t("admin.ownerControlsTitle")}</h2>
        </div>
        <Button
          disabled={paused.isFetching || mintPrice.isFetching}
          onClick={() => {
            void refetchPaused();
            void refetchMintPrice();
          }}
          size="sm"
          variant="ghost"
        >
          <Icon name="refresh" size={16} /> {t("admin.ownerControlsRefresh")}
        </Button>
      </div>
      <Card className="pv-owner-controls__card">
        <div className="pv-owner-controls__status">
          <span>
            {t("admin.ownerControlsMintState")}
            <strong>
              {paused.data === undefined
                ? t("admin.ownerControlsUnknown")
                : paused.data
                  ? t("admin.ownerControlsPaused")
                  : t("admin.ownerControlsActive")}
            </strong>
          </span>
          <span>
            {t("admin.ownerControlsCurrentPrice")}
            <strong>
              {mintPrice.data === undefined
                ? t("admin.ownerControlsUnknown")
                : `${formatEther(mintPrice.data)} ETH`}
            </strong>
          </span>
        </div>
        {!contractAddress && (
          <p className="pv-admin-error" role="alert">
            {t("admin.publicationContractMissing")}
          </p>
        )}
        {contractAddress && !connectedOwner && (
          <p className="pv-admin-error" role="alert">
            {t("admin.ownerControlsWrongWallet")}
          </p>
        )}
        {contractAddress && connectedOwner && !correctNetwork && (
          <p className="pv-admin-error" role="alert">
            {t("admin.publicationWrongNetwork")}
          </p>
        )}
        {chainUnavailable && (
          <p className="pv-admin-error" role="alert">
            {t("admin.ownerControlsChainError")}
          </p>
        )}
        <div className="pv-owner-controls__actions">
          <div>
            <p>{t("admin.ownerControlsPauseHint")}</p>
            <Button
              disabled={!canWrite || paused.data === undefined}
              onClick={sendPause}
              type="button"
              variant={paused.data ? "primary" : "secondary"}
            >
              {paused.data
                ? t("admin.ownerControlsUnpause")
                : t("admin.ownerControlsPause")}
            </Button>
          </div>
          <form onSubmit={sendPrice}>
            <FormField
              disabled={!canWrite || mintPrice.data === undefined}
              inputMode="decimal"
              label={t("admin.ownerControlsNewPrice")}
              name="mint-price"
              onChange={(event) => setPriceInput(event.currentTarget.value)}
              value={displayedPrice}
            />
            <Button
              disabled={!canWrite || mintPrice.data === undefined}
              type="submit"
            >
              {t("admin.ownerControlsSetPrice")}
            </Button>
          </form>
        </div>
        {hash && (
          <div className="pv-admin-publication__transaction" role="status">
            <Icon name="refresh" size={18} />
            <span>
              {receipt.data?.status === "success"
                ? t("admin.ownerControlsIncluded")
                : receipt.data?.status === "reverted"
                  ? t("admin.publicationReceiptFailed")
                  : receipt.isError
                    ? t("admin.ownerControlsReceiptError")
                    : t("admin.publicationPending")}
            </span>
            <a
              href={`https://sepolia.basescan.org/tx/${hash}`}
              rel="noreferrer"
              target="_blank"
            >
              {t("admin.publicationViewTransaction")}
            </a>
          </div>
        )}
        {hash && (receipt.data?.status || receipt.isError) && (
          <Button onClick={clearTransaction} size="sm" variant="ghost">
            {t("admin.ownerControlsDone")}
          </Button>
        )}
        {error && (
          <p className="pv-admin-error" role="alert">
            {t("admin.ownerControlsWalletError")}
          </p>
        )}
        <p className="pv-admin-publication__finality">
          {action
            ? t("admin.ownerControlsSubmitted")
            : t("admin.ownerControlsSafety")}
        </p>
      </Card>
    </section>
  );
}
