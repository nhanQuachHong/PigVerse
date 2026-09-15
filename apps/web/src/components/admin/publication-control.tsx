"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Address, Hash } from "viem";
import { useConnection, useSendTransaction } from "wagmi";

import type { AdminContentSlot } from "../../lib/admin-content";
import { adminContentQuery } from "../../lib/admin-content";
import { adminAuditQueryKey } from "../../lib/admin-audit";
import {
  type AdminPublicationClientError,
  type PublicationAction,
  prepareAdminPublication,
  recordAdminPublication,
} from "../../lib/admin-publication";
import {
  PENDING_PUBLICATION_EVENT,
  pendingPublicationKey,
  readPendingPublication,
  writePendingPublication,
} from "../../lib/pending-publication";
import { targetChain } from "../../lib/web3-config";
import { useLocale } from "../i18n/locale-provider";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { useAuthoritativeReceipt } from "../web3/use-authoritative-receipt";

function publicationErrorKey(error: unknown) {
  const code = (error as AdminPublicationClientError | undefined)?.code;
  if (code === "ASSET_NOT_READY")
    return "admin.publicationErrorAssets" as const;
  if (code === "TOKEN_ALREADY_MINTED")
    return "admin.publicationErrorMinted" as const;
  if (code === "PUBLICATION_STATE_CONFLICT")
    return "admin.publicationErrorConflict" as const;
  if (code === "CHAIN_STATE_UNAVAILABLE")
    return "admin.publicationErrorChain" as const;
  if (code === "TRANSACTION_PENDING")
    return "admin.publicationPending" as const;
  if (code === "TRANSACTION_FAILED")
    return "admin.publicationReceiptFailed" as const;
  return "admin.publicationErrorGeneric" as const;
}

export function PublicationControl({
  contractAddress,
  ownerWallet,
  slot,
}: {
  contractAddress: Address | null;
  ownerWallet: Address;
  slot: AdminContentSlot;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const connection = useConnection();
  const sendTransaction = useSendTransaction();
  const [preparing, setPreparing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<unknown>();
  const [recordedAction, setRecordedAction] = useState<PublicationAction>();
  const attemptedHash = useRef<Hash | undefined>(undefined);
  const connectedOwner =
    connection.status === "connected" &&
    !!connection.address &&
    connection.address.toLowerCase() === ownerWallet.toLowerCase();
  const correctNetwork = connection.chainId === targetChain.id;
  const storageKey =
    contractAddress && connection.address
      ? pendingPublicationKey({
          account: connection.address,
          chainId: targetChain.id,
          contract: contractAddress,
          tokenId: slot.tokenId,
        })
      : null;
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener(PENDING_PUBLICATION_EVENT, notify);
    window.addEventListener("storage", notify);
    return () => {
      window.removeEventListener(PENDING_PUBLICATION_EVENT, notify);
      window.removeEventListener("storage", notify);
    };
  }, []);
  const getSnapshot = useCallback(
    () => (storageKey ? readPendingPublication(storageKey) : undefined),
    [storageKey],
  );
  const hash = useSyncExternalStore(subscribe, getSnapshot, () => undefined);
  const receiptState = useAuthoritativeReceipt(hash);
  const lifecycle = slot.content?.lifecycleState;
  const action: PublicationAction | null =
    lifecycle === "READY"
      ? "publish"
      : lifecycle === "PUBLISHED"
        ? "unpublish"
        : null;

  const record = useCallback(
    async (transactionHash: Hash) => {
      setRecording(true);
      setError(undefined);
      try {
        const result = await recordAdminPublication(
          slot.tokenId,
          transactionHash,
        );
        setRecordedAction(result.action);
        queryClient.setQueryData<AdminContentSlot[]>(
          adminContentQuery.queryKey,
          (current) =>
            current?.map((candidate) =>
              candidate.tokenId === slot.tokenId && candidate.content
                ? {
                    ...candidate,
                    content: {
                      ...candidate.content,
                      lifecycleState: result.lifecycleState,
                    },
                  }
                : candidate,
            ),
        );
        void queryClient.invalidateQueries({ queryKey: adminAuditQueryKey });
        if (storageKey) writePendingPublication(storageKey, undefined);
      } catch (cause) {
        setError(cause);
      } finally {
        setRecording(false);
      }
    },
    [queryClient, slot.tokenId, storageKey],
  );

  useEffect(() => {
    if (hash && receiptState === "success" && attemptedHash.current !== hash) {
      attemptedHash.current = hash;
      void record(hash);
    }
  }, [hash, receiptState, record]);

  const begin = async () => {
    if (
      !action ||
      !contractAddress ||
      !connectedOwner ||
      !correctNetwork ||
      !storageKey
    )
      return;
    setPreparing(true);
    setError(undefined);
    setRecordedAction(undefined);
    try {
      const prepared = await prepareAdminPublication(slot.tokenId, action);
      if (
        prepared.transaction.to.toLowerCase() !== contractAddress.toLowerCase()
      )
        throw new Error("CONTRACT_MISMATCH");
      const submittedHash = await sendTransaction.mutateAsync({
        chainId: prepared.transaction.chainId,
        data: prepared.transaction.data,
        to: prepared.transaction.to,
        value: 0n,
      });
      writePendingPublication(storageKey, submittedHash);
    } catch (cause) {
      setError(cause);
    } finally {
      setPreparing(false);
    }
  };

  const resetFailed = () => {
    if (storageKey) writePendingPublication(storageKey, undefined);
    setError(undefined);
    attemptedHash.current = undefined;
  };

  return (
    <div className="pv-admin-publication">
      <div className="pv-admin-publication__heading">
        <div>
          <p className="pv-eyebrow">{t("admin.publicationEyebrow")}</p>
          <h3>{t("admin.publicationTitle")}</h3>
        </div>
        <span className="pv-admin-publication__state">
          {lifecycle ?? "DRAFT"}
        </span>
      </div>
      <p className="pv-admin-editor__hint">
        {action
          ? t("admin.publicationReadyHint")
          : t("admin.publicationNotReady")}
      </p>
      {!contractAddress && (
        <p className="pv-admin-error" role="alert">
          {t("admin.publicationContractMissing")}
        </p>
      )}
      {contractAddress && !connectedOwner && (
        <p className="pv-admin-error" role="alert">
          {t("admin.publicationWrongWallet")}
        </p>
      )}
      {contractAddress && connectedOwner && !correctNetwork && (
        <p className="pv-admin-error" role="alert">
          {t("admin.publicationWrongNetwork")}
        </p>
      )}
      {hash && (
        <div className="pv-admin-publication__transaction" role="status">
          <Icon name="refresh" size={18} />
          <span>
            {recording
              ? t("admin.publicationRecording")
              : receiptState === "reverted"
                ? t("admin.publicationReceiptFailed")
                : receiptState === "uncertain"
                  ? t("admin.publicationErrorChain")
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
      {recordedAction && (
        <p className="pv-admin-editor__success" role="status">
          <Icon name="check" size={18} />
          {recordedAction === "publish"
            ? t("admin.publicationPublished")
            : t("admin.publicationUnpublished")}
        </p>
      )}
      {error !== undefined && (
        <p className="pv-admin-error" role="alert">
          {t(publicationErrorKey(error))}
        </p>
      )}
      <div className="pv-admin-editor__actions">
        {action && !hash && (
          <Button
            disabled={
              preparing ||
              recording ||
              !contractAddress ||
              !connectedOwner ||
              !correctNetwork ||
              slot.chainState !== "unminted"
            }
            onClick={begin}
            type="button"
            variant={action === "unpublish" ? "secondary" : "primary"}
          >
            {preparing
              ? t("admin.publicationPreparing")
              : action === "publish"
                ? t("admin.publicationPublish")
                : t("admin.publicationUnpublish")}
          </Button>
        )}
        {hash &&
          (receiptState === "uncertain" ||
            (receiptState === "success" && error !== undefined)) && (
            <Button
              disabled={recording}
              onClick={() => {
                attemptedHash.current = hash;
                void record(hash);
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              {t("admin.publicationRetryRecord")}
            </Button>
          )}
        {hash && receiptState === "reverted" && (
          <Button
            onClick={resetFailed}
            size="sm"
            type="button"
            variant="secondary"
          >
            {t("admin.publicationResetFailed")}
          </Button>
        )}
      </div>
      <p className="pv-admin-publication__finality">
        {t("admin.publicationFinality")}
      </p>
    </div>
  );
}
