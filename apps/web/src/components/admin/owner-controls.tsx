"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { formatEther, parseEther, type Address } from "viem";
import {
  useBalance,
  useConnection,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { adminAuditQueryKey } from "../../lib/admin-audit";
import { recordAdminOwnerControl } from "../../lib/admin-owner-controls";
import { genesisAbi } from "../../lib/genesis-contract";
import {
  PENDING_OWNER_CONTROL_EVENT,
  pendingOwnerControlKey,
  readPendingOwnerControl,
  writePendingOwnerControl,
} from "../../lib/pending-owner-control";
import { targetChain } from "../../lib/web3-config";
import { useLocale } from "../i18n/locale-provider";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { FormField } from "../ui/form-field";
import { Icon } from "../ui/icon";

type OwnerAction = "pause" | "price" | "unpause" | "withdraw";

export function OwnerControls({
  contractAddress,
  ownerWallet,
}: {
  contractAddress: Address | null;
  ownerWallet: Address;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const connection = useConnection();
  const writeContract = useWriteContract();
  const [action, setAction] = useState<OwnerAction>();
  const [priceInput, setPriceInput] = useState<string>();
  const [error, setError] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [recordError, setRecordError] = useState(false);
  const attemptedHash = useRef<string | undefined>(undefined);
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
  const contractBalance = useBalance({
    address: contractAddress ?? undefined,
    chainId: targetChain.id,
    query: { enabled },
  });
  const storageKey = contractAddress
    ? pendingOwnerControlKey({
        account: ownerWallet,
        chainId: targetChain.id,
        contract: contractAddress,
      })
    : null;
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener(PENDING_OWNER_CONTROL_EVENT, notify);
    window.addEventListener("storage", notify);
    return () => {
      window.removeEventListener(PENDING_OWNER_CONTROL_EVENT, notify);
      window.removeEventListener("storage", notify);
    };
  }, []);
  const getSnapshot = useCallback(
    () => (storageKey ? readPendingOwnerControl(storageKey) : undefined),
    [storageKey],
  );
  const hash = useSyncExternalStore(subscribe, getSnapshot, () => undefined);
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
  const chainUnavailable =
    paused.isError || mintPrice.isError || contractBalance.isError;
  const refetchPaused = paused.refetch;
  const refetchMintPrice = mintPrice.refetch;
  const refetchBalance = contractBalance.refetch;
  const displayedPrice =
    priceInput ??
    (mintPrice.data === undefined ? "" : formatEther(mintPrice.data));

  const record = useCallback(
    async (transactionHash: `0x${string}`) => {
      setRecording(true);
      setRecordError(false);
      try {
        await recordAdminOwnerControl(transactionHash);
        setRecorded(true);
        void queryClient.invalidateQueries({ queryKey: adminAuditQueryKey });
        void refetchPaused();
        void refetchMintPrice();
        void refetchBalance();
      } catch {
        setRecordError(true);
      } finally {
        setRecording(false);
      }
    },
    [queryClient, refetchBalance, refetchMintPrice, refetchPaused],
  );

  useEffect(() => {
    if (
      hash &&
      receipt.data?.status === "success" &&
      attemptedHash.current !== hash
    ) {
      attemptedHash.current = hash;
      void record(hash);
    }
  }, [hash, receipt.data?.status, record]);

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
      if (storageKey) writePendingOwnerControl(storageKey, transactionHash);
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
      if (storageKey) writePendingOwnerControl(storageKey, transactionHash);
    } catch {
      setError(true);
    }
  };

  const sendWithdraw = async () => {
    if (
      !canWrite ||
      !contractAddress ||
      contractBalance.data === undefined ||
      contractBalance.data.value === 0n
    )
      return;
    setError(false);
    try {
      const transactionHash = await writeContract.mutateAsync({
        abi: genesisAbi,
        account: connection.address,
        address: contractAddress,
        chainId: targetChain.id,
        functionName: "withdraw",
      });
      setAction("withdraw");
      setConfirmWithdraw(false);
      if (storageKey) writePendingOwnerControl(storageKey, transactionHash);
    } catch {
      setError(true);
    }
  };

  const clearTransaction = () => {
    setAction(undefined);
    setError(false);
    setConfirmWithdraw(false);
    setRecorded(false);
    setRecordError(false);
    attemptedHash.current = undefined;
    if (storageKey) writePendingOwnerControl(storageKey, undefined);
  };

  return (
    <section className="pv-owner-controls" id="contract-controls">
      <div className="pv-admin-content__heading">
        <div>
          <p className="pv-eyebrow">{t("admin.ownerControlsEyebrow")}</p>
          <h2>{t("admin.ownerControlsTitle")}</h2>
        </div>
        <Button
          disabled={
            paused.isFetching ||
            mintPrice.isFetching ||
            contractBalance.isFetching
          }
          onClick={() => {
            void refetchPaused();
            void refetchMintPrice();
            void refetchBalance();
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
            {t("admin.ownerControlsBalance")}
            <strong>
              {contractBalance.data === undefined
                ? t("admin.ownerControlsUnknown")
                : `${formatEther(contractBalance.data.value)} ETH`}
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
          <div>
            <p>{t("admin.ownerControlsWithdrawHint")}</p>
            {!confirmWithdraw ? (
              <Button
                disabled={
                  !canWrite ||
                  contractBalance.data === undefined ||
                  contractBalance.data.value === 0n
                }
                onClick={() => setConfirmWithdraw(true)}
                type="button"
                variant="secondary"
              >
                {t("admin.ownerControlsWithdraw")}
              </Button>
            ) : (
              <div
                aria-label={t("admin.ownerControlsWithdrawConfirmButton")}
                className="pv-owner-controls__confirmation"
                role="group"
              >
                <p>
                  {t("admin.ownerControlsWithdrawConfirm")} {ownerWallet}
                </p>
                <strong>
                  {formatEther(contractBalance.data?.value ?? 0n)} ETH
                </strong>
                <div>
                  <Button
                    disabled={
                      !canWrite ||
                      contractBalance.data === undefined ||
                      contractBalance.data.value === 0n
                    }
                    onClick={sendWithdraw}
                    type="button"
                  >
                    {t("admin.ownerControlsWithdrawConfirmButton")}
                  </Button>
                  <Button
                    onClick={() => setConfirmWithdraw(false)}
                    type="button"
                    variant="ghost"
                  >
                    {t("admin.ownerControlsWithdrawCancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        {hash && (
          <div className="pv-admin-publication__transaction" role="status">
            <Icon name="refresh" size={18} />
            <span>
              {receipt.data?.status === "success"
                ? recording
                  ? t("admin.ownerControlsRecording")
                  : recorded
                    ? t("admin.ownerControlsAudited")
                    : t("admin.ownerControlsIncluded")
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
        {hash &&
          (receipt.isError ||
            (receipt.data?.status === "success" && recordError)) && (
            <Button
              disabled={recording}
              onClick={() => {
                attemptedHash.current = hash;
                void record(hash);
              }}
              size="sm"
              variant="secondary"
            >
              {t("admin.ownerControlsRetryAudit")}
            </Button>
          )}
        {hash && (recorded || receipt.data?.status === "reverted") && (
          <Button onClick={clearTransaction} size="sm" variant="ghost">
            {t("admin.ownerControlsDone")}
          </Button>
        )}
        {recordError && (
          <p className="pv-admin-error" role="alert">
            {t("admin.ownerControlsAuditError")}
          </p>
        )}
        {error && (
          <p className="pv-admin-error" role="alert">
            {t("admin.ownerControlsWalletError")}
          </p>
        )}
        <p className="pv-admin-publication__finality">
          {action || hash
            ? t("admin.ownerControlsSubmitted")
            : t("admin.ownerControlsSafety")}
        </p>
      </Card>
    </section>
  );
}
